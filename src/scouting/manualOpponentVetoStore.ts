// src/scouting/manualOpponentVetoStore.ts

import { supabase } from "../lib/supabaseClient";

export type VetoActionType = "pick" | "ban";

export interface ManualVetoAction {
  map: string;
  type: VetoActionType;
}

export interface ManualMatchVeto {
  matchId: string;
  teamId: string; // scouted team
  teamName: string;
  actions: ManualVetoAction[];
}

export interface TeamMapSummary {
  map: string;
  picks: number;
  bans: number;
  totalMatches: number;
  pickRate: number;
  banRate: number;
}

export interface TeamVetoSummary {
  matchesTracked: number;
  maps: TeamMapSummary[];
  likelyPermabans: string[];
  likelyComfortPicks: string[];
}

/**
 * Upsert veto actions for one match of one team.
 * Implementation:
 *  - delete existing rows for (team_id, match_id)
 *  - insert current actions
 */
export async function upsertManualMatchVeto(
  entry: ManualMatchVeto
): Promise<void> {
  const rows = entry.actions
    .map((a) => {
      const norm = normalizeMap(a.map);
      if (!norm) return null;
      return {
        team_id: entry.teamId,
        team_name: entry.teamName,
        match_id: entry.matchId,
        map: norm,
        action_type: a.type,
      };
    })
    .filter(Boolean) as {
    team_id: string;
    team_name: string;
    match_id: string;
    map: string;
    action_type: VetoActionType;
  }[];

  // Clear old logs for this match+team
  const { error: delErr } = await supabase
    .from("team_veto_logs")
    .delete()
    .eq("team_id", entry.teamId)
    .eq("match_id", entry.matchId);

  if (delErr) {
    console.error("Error deleting old veto logs", delErr);
    throw delErr;
  }

  if (!rows.length) return;

  const { error: insErr } = await supabase
    .from("team_veto_logs")
    .insert(rows);

  if (insErr) {
    console.error("Error inserting veto logs", insErr);
    throw insErr;
  }
}

/**
 * Return all manual veto logs for a team, grouped into ManualMatchVeto objects.
 */
export async function getManualVetoesForTeam(
  teamId: string
): Promise<ManualMatchVeto[]> {
  const { data, error } = await supabase
    .from("team_veto_logs")
    .select("team_id, team_name, match_id, map, action_type")
    .eq("team_id", teamId);

  if (error) {
    console.error("Error fetching veto logs", error);
    return [];
  }

  const byMatch: Record<string, ManualMatchVeto> = {};

  for (const row of data) {
    const matchId = row.match_id as string;
    if (!byMatch[matchId]) {
      byMatch[matchId] = {
        matchId,
        teamId: row.team_id as string,
        teamName: row.team_name as string,
        actions: [],
      };
    }
    byMatch[matchId].actions.push({
      map: row.map as string,
      type: row.action_type as VetoActionType,
    });
  }

  return Object.values(byMatch);
}

/**
 * Aggregated veto tendencies for a team based on stored logs.
 */
export async function getTeamVetoSummary(
  teamId: string
): Promise<TeamVetoSummary | null> {
  const entries = await getManualVetoesForTeam(teamId);
  if (!entries.length) return null;

  const mapCounts: Record<
    string,
    { picks: number; bans: number; matches: Set<string> }
  > = {};

  for (const match of entries) {
    for (const a of match.actions) {
      const mapName = normalizeMap(a.map);
      if (!mapName) continue;

      if (!mapCounts[mapName]) {
        mapCounts[mapName] = {
          picks: 0,
          bans: 0,
          matches: new Set(),
        };
      }

      if (a.type === "pick") mapCounts[mapName].picks += 1;
      if (a.type === "ban") mapCounts[mapName].bans += 1;
      mapCounts[mapName].matches.add(match.matchId);
    }
  }

  const maps: TeamMapSummary[] = Object.entries(mapCounts).map(
    ([map, data]) => {
      const totalMatches = data.matches.size || 1;
      return {
        map,
        picks: data.picks,
        bans: data.bans,
        totalMatches,
        pickRate: data.picks / totalMatches,
        banRate: data.bans / totalMatches,
      };
    }
  );

  const matchesTracked = entries.length;

  const likelyPermabans = maps
    .filter((m) => m.bans >= 2 && m.banRate >= 0.7)
    .map((m) => m.map);

  const likelyComfortPicks = maps
    .filter((m) => m.picks >= 2 && m.pickRate >= 0.5)
    .map((m) => m.map);

  maps.sort((a, b) => (b.picks + b.bans) - (a.picks + a.bans));

  return {
    matchesTracked,
    maps,
    likelyPermabans,
    likelyComfortPicks,
  };
}

// Normalize map names. Returns null for non-map noise (e.g. server locations).
function normalizeMap(raw: string): string | null {
  if (!raw) return null;
  const s = raw.trim().toLowerCase();

  if (s.includes("mirage")) return "Mirage";
  if (s.includes("inferno")) return "Inferno";
  if (s.includes("nuke")) return "Nuke";
  if (s.includes("ancient")) return "Ancient";
  if (s.includes("anubis")) return "Anubis";
  if (s.includes("vertigo")) return "Vertigo";
  if (s.includes("dust")) return "Dust2";
  if (s.includes("overpass")) return "Overpass";
  if (s.includes("train")) return "Train";

  // ignore city/server lines etc
  if (
    s.includes("chicago") ||
    s.includes("dallas") ||
    s.includes("denver") ||
    s.includes("newyork") ||
    s.includes("new york")
  ) {
    return null;
  }

  return raw.trim();
}
