// src/hooks/useLeagueMapSummary.ts
import { useEffect, useState } from "react";
import {
  getTeam,
  getPlayer,
  getMatchStats,
  getTeamLeagueMatchesForChampionship,
  getMatchVetoHistory, // ✅ NEW
} from "../api/faceit";
import type { LeagueMatchView } from "../types/league";

type Outcome = "win" | "loss" | "tie" | "unknown";

type MapStats = {
  [mapName: string]: { played: number };
};

type PlayerMapSummary = {
  nickname: string;
  playerId: string;
  maps: {
    [mapName: string]: {
      kills: number;
      deaths: number;
      adrSum: number;
      hsKills: number;
      rounds: number;
    };
  };
};

interface Args {
  teamId: string;
  championshipId: string;
  title?: string;
}

export function useLeagueMapSummary({
  teamId,
  championshipId,
  title,
}: Args) {
  const [rows, setRows] = useState<LeagueMatchView[]>([]);
  const [mapStats, setMapStats] = useState<MapStats>({});
  const [leagueName, setLeagueName] = useState<string | null>(null);
  const [locations, setLocations] = useState<Record<string, number>>({});
  const [players, setPlayers] = useState<
    { playerId: string; nickname: string; faceitElo?: number }[]
  >([]);
  const [playerMapStats, setPlayerMapStats] = useState<PlayerMapSummary[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!teamId || !championshipId) return;

    (async () => {
      try {
        setLoading(true);
        setError("");
        setRows([]);
        setMapStats({});
        setLeagueName(null);
        setLocations({});
        setPlayers([]);
        setPlayerMapStats([]);

        // 1) Team info -> roster/players (for ELO & names)
        const team = await getTeam(teamId);
        const roster: any[] = team.roster || team.members || team.players || [];

        const basePlayersRaw = await Promise.all(
          roster.map(async (p: any) => {
            const memberId: string | undefined =
              p.player_id || p.user_id || p.id || p.guid;
            const nickname: string = p.nickname || p.name || "";

            if (!memberId && !nickname) return null;

            try {
              const full = await getPlayer(memberId || nickname);
              const pid = full.player_id || memberId || nickname;
              const nick = full.nickname || nickname || "Unknown";
              const elo =
                full.games?.cs2?.faceit_elo ??
                full.faceit_elo ??
                undefined;

              return { playerId: pid, nickname: nick, faceitElo: elo };
            } catch {
              if (!memberId && !nickname) return null;
              return {
                playerId: memberId || nickname,
                nickname: nickname || memberId || "Unknown",
              };
            }
          })
        );

        const basePlayers = basePlayersRaw.filter(Boolean) as {
          playerId: string;
          nickname: string;
          faceitElo?: number;
        }[];
        setPlayers(basePlayers);

        // 2) All league matches
        const matches = await getTeamLeagueMatchesForChampionship(
          teamId,
          championshipId
        );
        if (!matches.length) {
          setLoading(false);
          return;
        }

        // 3) Stats for finished matches (for scores + per-player)
        const finishedMatches = matches.filter((m: any) => m.status === "FINISHED");
        const statsByMatchId: Record<string, any> = {};
        await Promise.all(
          finishedMatches.map(async (m: any) => {
            try {
              const s = await getMatchStats(m.match_id);
              statsByMatchId[m.match_id] = s;
            } catch {
              // ignore
            }
          })
        );

        // 4) NEW: Veto history for all matches (some scheduled have it too)
        const vetoByMatchId: Record<
          string,
          { picked: string[]; banned: string[]; locations: string[] }
        > = {};
        await Promise.all(
          matches.map(async (m: any) => {
            try {
              const v = await getMatchVetoHistory(m.match_id);
              if (v) vetoByMatchId[m.match_id] = v;
            } catch {
              // ignore
            }
          })
        );

        // 5) Build rows + aggregates
        const localRows: LeagueMatchView[] = [];
        const localMapStats: MapStats = {};
        const localLocations: Record<string, number> = {};
        const playerAgg: Record<string, PlayerMapSummary> = {};
        let name: string | null = null;

        for (const m of matches) {
          const f1 = m.teams?.faction1;
          const f2 = m.teams?.faction2;
          if (!f1 || !f2) continue;

          const our =
            f1.faction_id === teamId ? f1 : f2.faction_id === teamId ? f2 : null;
          const opp = our === f1 ? f2 : f1;
          if (!our || !opp) continue;

          const status = m.status || "UNKNOWN";
          if (!name && m.competition_name) name = m.competition_name;

          const url = m.faceit_url ? m.faceit_url.replace("{lang}", "en") : undefined;

          const sortKey = m.finished_at || m.started_at || m.scheduled_at || 0;

          // ---- SCORE / OUTCOME (from stats if possible) ----
          let ourScore: number | undefined;
          let oppScore: number | undefined;
          let outcome: Outcome = "unknown";

          const matchStats = statsByMatchId[m.match_id];

          if (status === "FINISHED" && matchStats?.rounds?.length) {
            const round = matchStats.rounds[0];
            const teamsStats: any[] = round.teams || [];

            const ourFactionId = our.faction_id;
            let ourTeamStats: any | undefined;
            let oppTeamStats: any | undefined;

            for (const t of teamsStats) {
              const tid = t.team_id || t.faction_id || t.guid || t.name;
              if (tid && (String(tid) === String(ourFactionId) || String(tid) === String(teamId))) {
                ourTeamStats = t;
              } else {
                oppTeamStats = t;
              }
            }

            if (!ourTeamStats) {
              const ourIds = new Set(
                (our.roster || our.players || []).map((p: any) => p.player_id).filter(Boolean)
              );
              for (const t of teamsStats) {
                const ids = (t.players || []).map((p: any) => p.player_id);
                const overlap = ids.some((id: string) => ourIds.has(id));
                if (overlap) ourTeamStats = t;
                else oppTeamStats = t;
              }
            }

            const os =
              ourTeamStats?.team_stats?.["Final Score"] ??
              ourTeamStats?.team_stats?.["Score"];
            const es =
              oppTeamStats?.team_stats?.["Final Score"] ??
              oppTeamStats?.team_stats?.["Score"];

            const osNum = os !== undefined ? Number(os) : NaN;
            const esNum = es !== undefined ? Number(es) : NaN;

            if (!Number.isNaN(osNum) && !Number.isNaN(esNum)) {
              ourScore = osNum;
              oppScore = esNum;
            }

            // Per-player aggregation (our team only)
            const mapNameRaw = round.round_stats?.Map || round.round_stats?.["Map"] || "";
            const mapName = typeof mapNameRaw === "string" && mapNameRaw ? mapNameRaw : "Unknown";

            if (ourTeamStats?.players && mapName !== "Unknown") {
              for (const pl of ourTeamStats.players) {
                const rawId =
                  pl.player_id || pl.user_id || pl.id || pl.guid || pl.nickname;
                if (!rawId) continue;

                const pid = String(rawId);
                const nick = pl.nickname || pid;

                const ps = pl.player_stats || {};
                const kills = Number(ps.Kills || 0);
                const deaths = Number(ps.Deaths || 0);
                const adr = Number(ps.ADR || ps["ADR"] || 0);
                const hsPctRaw = ps["Headshots %"] ?? ps["HS %"] ?? ps["HS%"] ?? 0;
                const hsPct = Number(hsPctRaw) / 100;

                if (!playerAgg[pid]) {
                  playerAgg[pid] = { nickname: nick, playerId: pid, maps: {} };
                }
                if (!playerAgg[pid].maps[mapName]) {
                  playerAgg[pid].maps[mapName] = {
                    kills: 0,
                    deaths: 0,
                    adrSum: 0,
                    hsKills: 0,
                    rounds: 0,
                  };
                }

                const mRef = playerAgg[pid].maps[mapName];
                mRef.kills += kills;
                mRef.deaths += deaths;
                mRef.adrSum += adr;
                mRef.rounds += 1;
                if (kills > 0 && hsPct > 0) {
                  mRef.hsKills += kills * hsPct;
                }
              }
            }
          }

          if (
            status === "FINISHED" &&
            (ourScore === undefined || oppScore === undefined)
          ) {
            const ourIsF1 = our === f1;

            if (m.results?.score) {
              const s = m.results.score;
              const sF1 = Number(s.faction1 ?? s["faction1"]);
              const sF2 = Number(s.faction2 ?? s["faction2"]);
              if (!Number.isNaN(sF1) && !Number.isNaN(sF2)) {
                ourScore = ourIsF1 ? sF1 : sF2;
                oppScore = ourIsF1 ? sF2 : sF1;
              }
            }

            if (
              (ourScore === undefined || oppScore === undefined) &&
              Array.isArray(m.detailed_results) &&
              m.detailed_results.length
            ) {
              const last = m.detailed_results[m.detailed_results.length - 1];
              const factions = last.factions || {};
              const f1Score = Number(factions.faction1?.score ?? factions["faction1"]?.score);
              const f2Score = Number(factions.faction2?.score ?? factions["faction2"]?.score);
              if (!Number.isNaN(f1Score) && !Number.isNaN(f2Score)) {
                const ourIsF1b = our === f1;
                ourScore = ourIsF1b ? f1Score : f2Score;
                oppScore = ourIsF1b ? f2Score : f1Score;
              }
            }
          }

          if (status === "FINISHED") {
            if (ourScore !== undefined && oppScore !== undefined) {
              if (ourScore > oppScore) outcome = "win";
              else if (ourScore < oppScore) outcome = "loss";
              else outcome = "tie";
            } else if (m.results?.winner) {
              const winner = m.results.winner;
              const ourIsWinner =
                (winner === "faction1" && our === f1) ||
                (winner === "faction2" && our === f2);
              const oppIsWinner =
                (winner === "faction1" && our === f2) ||
                (winner === "faction2" && our === f1);
              if (ourIsWinner) outcome = "win";
              else if (oppIsWinner) outcome = "loss";
            }
          }

          // ---- MAPS / LOCATIONS ----
          // Prefer democracy veto, fallback to match.voting, then stats map
          const democracy = vetoByMatchId[m.match_id];
          let pickedNames: string[] = [];
          let bannedNames: string[] = [];
          let matchLocations: string[] = [];

          if (democracy) {
            pickedNames = democracy.picked;
            bannedNames = democracy.banned;
            matchLocations = democracy.locations;
          } else {
            // fallback to match's built-in voting (often empty)
            const voting = m.voting || {};
            const mapVoting = voting.map;
            const locVoting = voting.location;

            if (locVoting?.pick && Array.isArray(locVoting.pick) && locVoting.entities) {
              const locPickIds = locVoting.pick as string[];
              const locNames = locVoting.entities
                .filter((e: any) => {
                  const id =
                    e.guid || e.game_location_id || e.class_name || e.name;
                  return id && locPickIds.includes(String(id));
                })
                .map((e: any) => e.name || e.class_name || e.game_location_id || e.guid);
              if (locNames.length) {
                matchLocations.push(...locNames);
              }
            }

            if (mapVoting?.entities?.length) {
              const rawPicks = (mapVoting.pick ?? mapVoting.picks ?? []) as any[];
              const pickIds: string[] = Array.isArray(rawPicks)
                ? rawPicks
                    .map((p) => {
                      if (typeof p === "string") return p;
                      if (p && typeof p === "object") {
                        return (
                          (p as any).id ||
                          (p as any).game_map_id ||
                          (p as any).class_name ||
                          (p as any).guid ||
                          ""
                        );
                      }
                      return "";
                    })
                    .filter((v): v is string => typeof v === "string" && !!v)
                : [];

              const isPicked = (ent: any) => {
                const id = ent.guid || ent.game_map_id || ent.class_name || ent.name;
                return id && pickIds.includes(String(id));
              };

              const pickedEntities = mapVoting.entities.filter(isPicked);
              const bannedEntities = mapVoting.entities.filter((e: any) => !isPicked(e));

              pickedNames.push(
                ...pickedEntities.map(
                  (e: any) => e.name || e.class_name || e.game_map_id || e.guid
                )
              );
              bannedNames.push(
                ...bannedEntities.map(
                  (e: any) => e.name || e.class_name || e.game_map_id || e.guid
                )
              );
            }

            if (!pickedNames.length && matchStats?.rounds?.length) {
              const round = matchStats.rounds[0];
              const mapName = round.round_stats?.Map || round.round_stats?.["Map"];
              if (mapName) pickedNames.push(mapName);
            }
          }

          // Aggregate maps (only finished)
          if (status === "FINISHED" && pickedNames.length) {
            const primary = pickedNames[0];
            if (!localMapStats[primary]) {
              localMapStats[primary] = { played: 0 };
            }
            localMapStats[primary].played += 1;
          }

          // Aggregate locations (only finished)
          if (status === "FINISHED" && matchLocations.length) {
            const loc0 = matchLocations[0];
            localLocations[loc0] = (localLocations[loc0] || 0) + 1;
          }

          localRows.push({
            matchId: m.match_id,
            opponent: opp.name || "Unknown",
            status,
            picked: pickedNames,
            banned: bannedNames,
            locations: matchLocations,
            ourScore,
            oppScore,
            outcome,
            url,
            sortKey,
          });
        }

        setRows(localRows);
        setMapStats(localMapStats);
        setLocations(localLocations);
        setLeagueName(name || title || null);
        setPlayerMapStats(Object.values(playerAgg));
      } catch (e: any) {
        console.error(e);
        setError(e.message || "Failed to load league matches.");
      } finally {
        setLoading(false);
      }
    })();
  }, [teamId, championshipId, title]);

  return {
    loading,
    error,
    rows,
    mapStats,
    leagueName,
    locations,
    players,
    playerMapStats,
  };
}
