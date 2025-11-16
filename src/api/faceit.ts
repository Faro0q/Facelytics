// src/api/faceit.ts

const FACEIT_API_BASE = "https://open.faceit.com/data/v4";

const headers = () => ({
  Authorization: `Bearer ${import.meta.env.VITE_FACEIT_API_KEY}`,
  "Content-Type": "application/json",
});

export interface FaceitTeamSearchItem {
  team_id: string;
  name: string;
  avatar?: string;
  game: string;
  faceit_url: string;
  verified: boolean;
}

export interface FaceitTeamStats {
  team_id: string;
  game_id: string;
  lifetime: Record<string, any>;
  segments: Array<Record<string, any>>;
}

export interface LeagueTeamSummary {
  team_id: string;
  name: string;
  avatar?: string;
  game?: string;
  faceit_url?: string;
  verified?: boolean;
}

// --- in-memory caches ---
const championshipMatchesCache: Record<string, any[]> = {};
const championshipTeamsCache: Record<string, LeagueTeamSummary[]> = {};

// ========== BASIC HELPERS ==========

export async function searchTeams(
  nickname: string,
  game = "cs2"
): Promise<FaceitTeamSearchItem[]> {
  if (!nickname.trim()) return [];
  const url = new URL(`${FACEIT_API_BASE}/search/teams`);
  url.searchParams.set("nickname", nickname);
  url.searchParams.set("game", game);
  url.searchParams.set("limit", "10");

  const res = await fetch(url.toString(), { headers: headers() });
  if (!res.ok) throw new Error(`Search failed (${res.status})`);

  const data = await res.json();
  return data.items || [];
}

export async function getTeamStats(
  teamId: string,
  gameId = "cs2"
): Promise<FaceitTeamStats> {
  const url = `${FACEIT_API_BASE}/teams/${teamId}/stats/${gameId}`;
  const res = await fetch(url, { headers: headers() });

  if (res.status === 404) {
    throw new Error("NOT_FOUND");
  }
  if (!res.ok) throw new Error(`Stats fetch failed (${res.status})`);

  return res.json();
}

export async function getTeam(teamId: string) {
  const url = `${FACEIT_API_BASE}/teams/${teamId}`;
  const res = await fetch(url, { headers: headers() });
  if (!res.ok) throw new Error(`Failed to load team (${res.status})`);
  return res.json();
}

export async function getMatch(matchId: string) {
  const url = `${FACEIT_API_BASE}/matches/${matchId}`;
  const res = await fetch(url, { headers: headers() });
  if (!res.ok) throw new Error(`Failed to load match ${matchId} (${res.status})`);
  return res.json();
}

export async function getMatchStats(matchId: string) {
  const url = `${FACEIT_API_BASE}/matches/${matchId}/stats`;
  const res = await fetch(url, { headers: headers() });
  if (!res.ok) throw new Error(`Failed to load match stats (${res.status})`);
  return res.json();
}

// ========== PLAYER HISTORY HELPERS (for fallback) ==========

export async function getPlayerHistory(
  playerId: string,
  game = "cs2",
  limit = 100
) {
  const params = new URLSearchParams({
    game,
    limit: String(limit),
    offset: "0",
  });

  const url = `${FACEIT_API_BASE}/players/${playerId}/history?${params.toString()}`;
  const res = await fetch(url, { headers: headers() });
  if (!res.ok) throw new Error(`Failed to load player history (${res.status})`);

  const data = await res.json();
  return data.items || [];
}

/**
 * From one player's history, pull matches that:
 * - belong to this championship
 * - and actually contain the given teamId in faction1/2
 */
export async function getTeamLeagueMatchesFromPlayerHistory(
  teamId: string,
  championshipId: string,
  playerId: string
) {
  const history = await getPlayerHistory(playerId, "cs2", 100);

  const leagueEntries = history.filter(
    (item: any) => item.competition_id === championshipId
  );

  if (!leagueEntries.length) return [];

  const detailed = await Promise.all(
    leagueEntries.map(async (item: any) => {
      try {
        return await getMatch(item.match_id);
      } catch {
        return null;
      }
    })
  );

  return detailed.filter((m: any) => {
    if (!m) return false;
    const f1 = m.teams?.faction1;
    const f2 = m.teams?.faction2;
    return f1?.faction_id === teamId || f2?.faction_id === teamId;
  });
}

// ========== CHAMPIONSHIP MATCHES (WITH SAFE PAGINATION) ==========

export async function getAllChampionshipMatches(
  championshipId: string
): Promise<any[]> {
  if (!championshipId) return [];

  if (championshipMatchesCache[championshipId]) {
    return championshipMatchesCache[championshipId];
  }

  const all: any[] = [];
  const limit = 100;
  let offset = 0;

  while (true) {
    const url = `${FACEIT_API_BASE}/championships/${championshipId}/matches?type=all&offset=${offset}&limit=${limit}`;
    const res = await fetch(url, { headers: headers() });

    // FACEIT sometimes returns 400 if you go past last page.
    if (res.status === 400 && offset > 0) {
      console.warn(
        "[FACEIT] 400 at offset",
        offset,
        "→ treating as end of pages"
      );
      break;
    }

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error("[FACEIT] matches page error", {
        status: res.status,
        url,
        body,
      });
      throw new Error(
        `Failed to load championship matches (${res.status})`
      );
    }

    const data = await res.json();
    const items: any[] = Array.isArray(data.items)
      ? data.items
      : Array.isArray(data)
      ? data
      : [];

    if (!items.length) break;
    all.push(...items);

    if (items.length < limit) break;

    offset += limit;
  }

  championshipMatchesCache[championshipId] = all;

  return all;
}

// ========== LEAGUE TEAM INDEX (for search) ==========

export async function getChampionshipTeamsIndex(
  championshipId: string
): Promise<LeagueTeamSummary[]> {
  if (!championshipId) return [];

  if (championshipTeamsCache[championshipId]) {
    return championshipTeamsCache[championshipId];
  }

  const matches = await getAllChampionshipMatches(championshipId);
  const teams = new Map<string, LeagueTeamSummary>();

  for (const m of matches) {
    const f1 = m?.teams?.faction1;
    const f2 = m?.teams?.faction2;

    if (f1?.faction_id && f1.name && !teams.has(f1.faction_id)) {
      teams.set(f1.faction_id, {
        team_id: f1.faction_id,
        name: f1.name,
        avatar: f1.avatar,
        game: m.game || "cs2",
      });
    }

    if (f2?.faction_id && f2.name && !teams.has(f2.faction_id)) {
      teams.set(f2.faction_id, {
        team_id: f2.faction_id,
        name: f2.name,
        avatar: f2.avatar,
        game: m.game || "cs2",
      });
    }
  }

  const list = Array.from(teams.values()).sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  championshipTeamsCache[championshipId] = list;
  return list;
}

// ========== VETO HISTORY (Faceit democracy API) ==========

export type DemocracyVetoHistory = {
  map?: {
    entities?: Array<Record<string, any>>;
    pick?: string[];
    picks?: string[];
  };
  location?: {
    entities?: Array<Record<string, any>>;
    pick?: string[];
    picks?: string[];
  };
  voting?: Record<string, any>;
  [key: string]: any;
};

function getEntityName(ent: any): string {
  return (
    ent?.name ||
    ent?.class_name ||
    ent?.game_map_id ||
    ent?.guid ||
    ent?.id ||
    ""
  );
}
function getEntityId(ent: any): string {
  return (
    ent?.guid ||
    ent?.game_map_id ||
    ent?.class_name ||
    ent?.name ||
    ent?.id ||
    ""
  );
}

function parseDemocracyHistoryToVeto(
  h: DemocracyVetoHistory
): { picked: string[]; banned: string[]; locations: string[] } {
  const picked: string[] = [];
  const banned: string[] = [];
  const locations: string[] = [];

  const map = h?.map ?? h?.voting?.map;
  const loc = h?.location ?? h?.voting?.location;

  if (map?.entities?.length) {
    const rawPicks =
      Array.isArray(map.picks) && map.picks.length
        ? map.picks
        : Array.isArray(map.pick)
        ? map.pick
        : [];

    const pickIds = new Set<string>(
      rawPicks
        .map((p: any) =>
          typeof p === "string"
            ? p
            : p?.id ||
              p?.game_map_id ||
              p?.class_name ||
              p?.guid ||
              ""
        )
        .filter(Boolean)
        .map(String)
    );

    const pickedEntities = map.entities.filter((ent: any) =>
      pickIds.has(String(getEntityId(ent)))
    );
    const bannedEntities = map.entities.filter(
      (ent: any) => !pickIds.has(String(getEntityId(ent)))
    );

    picked.push(...pickedEntities.map(getEntityName).filter(Boolean));
    banned.push(...bannedEntities.map(getEntityName).filter(Boolean));
  }

  if (loc?.entities?.length) {
    const rawLocPicks =
      Array.isArray(loc.picks) && loc.picks.length
        ? loc.picks
        : Array.isArray(loc.pick)
        ? loc.pick
        : [];

    const locPickIds = new Set<string>(
      rawLocPicks
        .map((p: any) =>
          typeof p === "string"
            ? p
            : p?.id ||
              p?.game_location_id ||
              p?.class_name ||
              p?.guid ||
              ""
        )
        .filter(Boolean)
        .map(String)
    );

    const pickedLocations = loc.entities
      .filter((ent: any) => locPickIds.has(String(getEntityId(ent))))
      .map(getEntityName)
      .filter(Boolean);

    locations.push(...pickedLocations);
  }

  // Dedup while preserving order
  const dedup = (arr: string[]) => Array.from(new Set(arr));
  return {
    picked: dedup(picked),
    banned: dedup(banned),
    locations: dedup(locations),
  };
}

/**
 * Fetch veto history from Faceit democracy web API (not Open API).
 * Returns null on 404 or if nothing parseable is found.
 *
 * NOTE: If you hit CORS in production, proxy via a serverless function:
 *   /api/faceit-democracy?matchId=...
 */
export async function getMatchVetoHistory(
  matchId: string
): Promise<{ picked: string[]; banned: string[]; locations: string[] } | null> {
  if (!matchId) return null;

  try {
    const url = `https://www.faceit.com/api/democracy/v1/match/${matchId}/history`;
    const res = await fetch(url, {
      headers: { accept: "application/json, text/plain, */*" },
      credentials: "omit",
      method: "GET",
    });

    if (res.status === 404) return null;
    if (!res.ok) {
      console.warn("[VETO] democracy fetch failed", matchId, res.status);
      return null;
    }

    const data = (await res.json()) as DemocracyVetoHistory;
    const parsed = parseDemocracyHistoryToVeto(data);

    if (
      parsed.picked.length === 0 &&
      parsed.banned.length === 0 &&
      parsed.locations.length === 0
    ) {
      return null;
    }

    return parsed;
  } catch (err) {
    console.warn("[VETO] democracy fetch error", matchId, err);
    return null;
  }
}

// ========== FINAL: TEAM LEAGUE MATCHES (HYBRID APPROACH) ==========

/**
 * Get ALL league matches (finished + scheduled) for a given team in a championship.
 *
 * 1. Uses /championships/{id}/matches (paged) to get:
 *    - scheduled/upcoming
 *    - any finished that appear there
 * 2. Uses player history for team members as fallback to catch:
 *    - finished matches that might not appear in some pages
 * 3. Merges by match_id and sorts newest -> oldest
 */
export async function getTeamLeagueMatchesForChampionship(
  teamId: string,
  championshipId: string
): Promise<any[]> {
  if (!teamId || !championshipId) return [];

  // 1) From championship list
  const allChamp = await getAllChampionshipMatches(championshipId);
  const fromChamp = allChamp.filter((m: any) => {
    const f1 = m?.teams?.faction1;
    const f2 = m?.teams?.faction2;
    if (!f1 || !f2) return false;
    return f1.faction_id === teamId || f2.faction_id === teamId;
  });

  // 2) From player history (fallback for missing finished matches)
  let fromHistory: any[] = [];
  try {
    const team = await getTeam(teamId);
    const leaderId: string | undefined = team.leader;
    const roster: any[] =
      team.roster || team.members || team.players || [];

    // Pull all plausible player IDs from roster
    const rosterIds = roster
      .map((p: any) =>
        p.player_id ||
        p.user_id ||
        p.id ||
        p.guid ||
        null
      )
      .filter((id: any): id is string => !!id);

    // Build unique candidate list: leader + roster players
    const candidates = Array.from(
      new Set(
        [leaderId, ...rosterIds].filter(Boolean) as string[]
      )
    );

    const seen: Record<string, boolean> = {};

    for (const pid of candidates) {
      try {
        const matches = await getTeamLeagueMatchesFromPlayerHistory(
          teamId,
          championshipId,
          pid
        );

        for (const m of matches) {
          if (!m || !m.match_id) continue;
          if (!seen[m.match_id]) {
            seen[m.match_id] = true;
            fromHistory.push(m);
          }
        }
      } catch {
        // ignore this candidate
      }
    }
  } catch {
    // if team lookup fails, we just won't have history fallback
  }

  // 3) Merge championship + history by match_id
  const byId: Record<string, any> = {};

  for (const m of fromChamp) {
    if (m && m.match_id) {
      byId[m.match_id] = m;
    }
  }

  for (const m of fromHistory) {
    if (!m || !m.match_id) continue;
    if (!byId[m.match_id]) {
      byId[m.match_id] = m;
    }
  }

  const combined: any[] = Object.values(byId);

  // 4) Sort newest -> oldest using finished/started/scheduled timestamps
  combined.sort((a, b) => {
    const ta = a.finished_at || a.started_at || a.scheduled_at || 0;
    const tb = b.finished_at || b.started_at || b.scheduled_at || 0;
    return tb - ta; // newest first
  });

  return combined;
}

// ========== PLAYER (for ELO etc.) ==========

export async function getPlayer(playerId: string) {
  const url = `${FACEIT_API_BASE}/players/${playerId}`;
  const res = await fetch(url, { headers: headers() });
  if (!res.ok) throw new Error(`Failed to load player (${res.status})`);
  return res.json();
}
