// src/components/LeagueMapSummary/LocationsPlayed.tsx

import React from "react";

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

interface LocationsPlayedProps {
  locations: Record<string, number>;
}

export const LocationsPlayed: React.FC<
  LocationsPlayedProps
> = ({ locations }) => {
  if (!Object.keys(locations).length) return null;

  return (
    <div style={{ marginTop: "0.8rem" }}>
      <div
        style={{
          marginBottom: "0.3rem",
          fontSize: "0.95rem",
          fontWeight: 600,
          color: "#e5e7eb",
        }}
      >
        Locations played
      </div>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "0.4rem",
        }}
      >
        {Object.entries(locations)
          .sort((a, b) => b[1] - a[1])
          .map(([loc, count]) => (
            <div key={loc} style={chipStyle}>
              <span>{loc}</span>
              <span
                style={{
                  fontWeight: 600,
                  color: "#38bdf8",
                }}
              >
                ×{count}
              </span>
            </div>
          ))}
      </div>
    </div>
  );
};
