import type {
  ManualVetoAction,
  VetoActionType,
} from "./manualOpponentVetoStore";

/**
 * Parse a veto log for a specific team.
 *
 * Rules:
 * - Lines mentioning `teamName` + "banned"   -> ban
 * - Lines mentioning `teamName` + "picked"  -> pick
 * - "X picked by default":
 *     -> treated as a pick for this team ONLY if:
 *        - this team has no explicit picks yet, AND
 *        - this team performed the last ban in the log.
 */
export function parseVetoLogForTeam(
  rawText: string,
  teamName: string
): ManualVetoAction[] {
  const lines = rawText
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const needle = teamName.toLowerCase();
  const actions: ManualVetoAction[] = [];

  let defaultPickMap: string | null = null;
  let lastBanByOurTeam = false; // track who did the final ban we see

  for (const line of lines) {
    const lower = line.toLowerCase();

    // Capture "picked by default" map (could be for either team)
    if (lower.includes("picked by default")) {
      const m = extractMapName(line);
      if (m) {
        defaultPickMap = m;
      }
    }

    // Track who made the last ban in the sequence
    if (lower.includes("banned")) {
      if (lower.includes(needle)) {
        lastBanByOurTeam = true;
      } else {
        lastBanByOurTeam = false;
      }
    }

    // Only record explicit actions for this team
    if (!lower.includes(needle)) continue;

    let type: VetoActionType | null = null;

    if (lower.includes("banned")) {
      type = "ban";
    } else if (lower.includes("picked") && !lower.includes("picked by default")) {
      // real explicit pick line
      type = "pick";
    }

    if (!type) continue;

    const map = extractMapName(line);
    if (!map) continue;

    actions.push({ map, type });
  }

  // Decider heuristic:
  // If there is a "picked by default" map,
  // and THIS team has no explicit picks,
  // and THIS team did the last ban,
  // treat that default map as this team's pick.
  const hasExplicitPick = actions.some((a) => a.type === "pick");

  if (
    defaultPickMap &&
    !hasExplicitPick &&
    lastBanByOurTeam
  ) {
    actions.push({
      map: defaultPickMap,
      type: "pick",
    });
  }

  return actions;
}

/**
 * Try to extract the map name from a veto line.
 *
 * Handles:
 * - "<team> banned <map>"
 * - "<map> picked by default"
 * - "<map> picked"
 */
function extractMapName(line: string): string | null {
  const parts = line.trim().split(/\s+/);
  if (!parts.length) return null;

  const lower = parts.map((p) => p.toLowerCase());
  const bannedIdx = lower.lastIndexOf("banned");
  const pickedIdx = lower.lastIndexOf("picked");

  // "<team> banned <map>"
  if (bannedIdx !== -1 && bannedIdx + 1 < parts.length) {
    return parts.slice(bannedIdx + 1).join(" ");
  }

  // "<map> picked by default" or "<map> picked"
  if (pickedIdx !== -1) {
    // Common FACEIT style: "Nuke picked by default"
    if (pickedIdx > 0) {
      return parts[pickedIdx - 1];
    }
    if (pickedIdx + 1 < parts.length) {
      return parts[pickedIdx + 1];
    }
  }

  return null;
}
