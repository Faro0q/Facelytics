// src/components/LeagueMapSummary/MapsPlayed.tsx

import React from "react";
import type { MapStats } from "../../types/league";

const chipStyle: React.CSSProperties = {
  padding: "0.35rem 0.7rem",
  borderRadius: "999px",
  background: "rgba(15,23,42,0.98)",
  border: "1px solid rgba(75,85,99,0.9)",
  display: "inline-flex",
  alignItems: "center",
  gap: "0.3rem",
  fontSize: "0.88rem",
  color: "#e5e7eb",
};

interface MapsPlayedProps {
  mapStats: MapStats;
}

export const MapsPlayed: React.FC<MapsPlayedProps> = ({
  mapStats,
}) => {
  if (!Object.keys(mapStats).length) return null;

  return (
    <div style={{ marginTop: "1rem" }}>
      <div
        style={{
          marginBottom: "0.3rem",
          fontSize: "0.95rem",
          fontWeight: 600,
          color: "#e5e7eb",
        }}
      >
        Maps played
      </div>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "0.4rem",
        }}
      >
        {Object.entries(mapStats)
          .sort((a, b) => b[1].played - a[1].played)
          .map(([map, s]) => (
            <div key={map} style={chipStyle}>
              <span>{map}</span>
              <span
                style={{
                  fontWeight: 600,
                  color: "#a5b4fc",
                }}
              >
                ×{s.played}
              </span>
            </div>
          ))}
      </div>
    </div>
  );
};
