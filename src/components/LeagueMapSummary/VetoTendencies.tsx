// src/components/LeagueMapSummary/VetoTendencies.tsx
// Auto-only: computed from LeagueMatchView.picked/banned (no manual overrides)

import React from "react";
import type { LeagueMatchView } from "../../types/league";

type MapAgg = {
  map: string;
  picks: number;
  bans: number;
  pickRate: number; // picks / (picks + bans)
  banRate: number;  // bans / (picks + bans)
};

interface Props {
  teamId: string;
  teamName: string;
  matches: LeagueMatchView[]; // pass finishedSorted here
}

/** Tunables */
const THRESHOLDS = {
  permabanMinEvents: 3,
  permabanRate: 0.8,
  comfortMinEvents: 2,
  comfortPickRate: 0.6,
};

const chipStyle: React.CSSProperties = {
  padding: "0.35rem 0.7rem",
  borderRadius: "999px",
  background: "rgba(15,23,42,0.98)",
  border: "1px solid rgba(75,85,99,0.9)",
  display: "inline-flex",
  alignItems: "center",
  gap: "0.35rem",
  fontSize: "0.9rem",
  color: "#e5e7eb",
  whiteSpace: "nowrap",
};

const sectionLabel: React.CSSProperties = {
  fontSize: "0.95rem",
  fontWeight: 600,
  color: "#e5e7eb",
  marginBottom: "0.35rem",
  marginTop: "0.25rem",
};

const pill: React.CSSProperties = {
  ...chipStyle,
  padding: "0.18rem 0.55rem",
  fontSize: "0.78rem",
  color: "#9ca3af",
  borderColor: "rgba(75,85,99,0.65)",
};

export const VetoTendencies: React.FC<Props> = ({ teamId, teamName, matches }) => {
  const [maps, setMaps] = React.useState<MapAgg[]>([]);
  const [permabans, setPermabans] = React.useState<string[]>([]);
  const [comfort, setComfort] = React.useState<string[]>([]);
  const [topComfort, setTopComfort] = React.useState<MapAgg | null>(null);
  const [matchesTracked, setMatchesTracked] = React.useState(0);

  React.useEffect(() => {
    const counts = new Map<string, { picks: number; bans: number }>();
    let tracked = 0;

    for (const m of matches) {
      if (m.status !== "FINISHED") continue;
      const picked = m.picked || [];
      const banned = m.banned || [];
      if (!picked.length && !banned.length) continue;

      tracked += 1;

      const uniq = (arr: string[]) => Array.from(new Set(arr));
      for (const map of uniq(picked)) {
        const obj = counts.get(map) || { picks: 0, bans: 0 };
        obj.picks += 1;
        counts.set(map, obj);
      }
      for (const map of uniq(banned)) {
        const obj = counts.get(map) || { picks: 0, bans: 0 };
        obj.bans += 1;
        counts.set(map, obj);
      }
    }

    setMatchesTracked(tracked);

    const aggs: MapAgg[] = Array.from(counts.entries()).map(([map, c]) => {
      const total = Math.max(1, c.picks + c.bans);
      return {
        map,
        picks: c.picks,
        bans: c.bans,
        pickRate: c.picks / total,
        banRate: c.bans / total,
      };
    });

    const top = aggs
      .filter((m) => m.picks >= 1)
      .sort((a, b) => (b.pickRate - a.pickRate) || (b.picks - a.picks))[0] || null;
    setTopComfort(top || null);

    const comfy = aggs
      .filter(
        (m) =>
          m.picks + m.bans >= THRESHOLDS.comfortMinEvents &&
          m.pickRate >= THRESHOLDS.comfortPickRate &&
          m.picks >= m.bans
      )
      .map((m) => m.map);

    const perma = aggs
      .filter(
        (m) =>
          m.picks === 0 &&
          m.bans >= THRESHOLDS.permabanMinEvents &&
          m.banRate >= THRESHOLDS.permabanRate
      )
      .map((m) => m.map);

    aggs.sort((a, b) => {
      const ta = a.picks + a.bans;
      const tb = b.picks + b.bans;
      if (tb !== ta) return tb - ta;
      return b.pickRate - a.pickRate;
    });

    setMaps(aggs);
    setComfort(
      comfy.sort((aName, bName) => {
        const a = aggs.find((x) => x.map === aName)!;
        const b = aggs.find((x) => x.map === bName)!;
        return (b.pickRate - a.pickRate) || (b.picks - a.picks) || aName.localeCompare(bName);
      })
    );
    setPermabans(perma.sort());
  }, [teamId, teamName, matches]);

  if (matchesTracked === 0) return null;

  return (
    <div style={{ marginTop: "0.8rem", marginBottom: "0.8rem" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: "0.5rem",
          marginBottom: "0.4rem",
        }}
      >
        <h4 style={{ margin: 0, fontSize: "1.02rem", fontWeight: 600, color: "#e5e7eb" }}>
          Veto tendencies
        </h4>
        <div style={pill}>
          {matchesTracked} {matchesTracked === 1 ? "match" : "matches"} scouted
        </div>
      </div>

      {/* Top comfort pick */}
      {topComfort && (
        <div style={{ marginBottom: "0.55rem" }}>
          <div style={sectionLabel}>Top comfort pick</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
            <span style={chipStyle}>
              <strong style={{ color: "#38bdf8" }}>★ {topComfort.map}</strong>
              <span style={{ color: "#9ca3af" }}>pick</span>
              <span style={{ color: "#38bdf8", fontWeight: 700 }}>
                {Math.round(topComfort.pickRate * 100)}%
              </span>
              <span style={{ color: "#e5e7eb" }}>
                {topComfort.picks} picks / {topComfort.bans} bans
              </span>
            </span>
          </div>
        </div>
      )}

      {/* Permabans */}
      {permabans.length > 0 && (
        <div style={{ marginBottom: "0.45rem" }}>
          <div style={sectionLabel}>Permabans</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
            {permabans.map((m) => (
              <span key={m} style={chipStyle}>
                <strong style={{ color: "#f97316" }}>{m}</strong>
                <span style={{ color: "#f97316" }}>permaban</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Per-map breakdown with fixed columns for perfect alignment */}
      <div style={{ marginTop: "0.2rem" }}>
        {maps.map((m) => {
          const pPct = Math.round(m.pickRate * 100);
          const bPct = Math.round(m.banRate * 100);

          return (
            <div
              key={m.map}
              style={{
                display: "grid",
                gridTemplateColumns: "180px 260px 1fr", // name | BAR | stats
                alignItems: "center",
                gap: "0.8rem",
                padding: "0.28rem 0",
                borderBottom: "1px solid rgba(24,35,45,0.9)",
                fontSize: "0.9rem",
              }}
            >
              {/* Name (fixed width column) */}
              <div style={{ color: "#e5e7eb", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis" }}>
                {m.map}
              </div>

              {/* Bar (fixed width column) */}
              <div
                style={{
                  width: "100%",
                  height: 8,
                  borderRadius: 999,
                  overflow: "hidden",
                  background: "rgba(31,41,55,0.9)",
                  border: "1px solid rgba(75,85,99,0.6)",
                }}
                aria-label={`Pick ${pPct}% / Ban ${bPct}%`}
              >
                <div
                  style={{
                    width: `${pPct}%`,
                    height: "100%",
                    background: "#38bdf8",
                  }}
                />
              </div>

              {/* Stats (right column, right-aligned) */}
              <div style={{ color: "#9ca3af", textAlign: "right", whiteSpace: "nowrap" }}>
                <span style={{ color: "#38bdf8" }}>P {pPct}%</span>
                <span> · </span>
                <span style={{ color: "#f97316" }}>B {bPct}%</span>
                <span> • </span>
                <span style={{ color: "#e5e7eb" }}>
                  {m.picks} picks / {m.bans} bans
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
