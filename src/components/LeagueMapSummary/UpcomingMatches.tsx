// src/components/LeagueMapSummary/UpcomingMatches.tsx

import React from "react";
import type { LeagueMatchView } from "../../types/league";

interface UpcomingMatchesProps {
  matches: LeagueMatchView[];
  onOpponentClick?: (
    opponentName: string
  ) => Promise<void> | void;
}

export const UpcomingMatches: React.FC<
  UpcomingMatchesProps
> = ({ matches, onOpponentClick }) => {
  if (!matches.length) return null;

  return (
    <>
      <div
        style={{
          marginTop: "1rem",
          marginBottom: "0.35rem",
          fontSize: "0.95rem",
          fontWeight: 500,
          color: "#38bdf8",
          opacity: 0.9,
        }}
      >
        Upcoming / scheduled
      </div>
      <div style={{ fontSize: "0.9rem" }}>
        {matches.map((r) => (
          <div
            key={r.matchId}
            style={{
              padding: "0.45rem 0",
              borderBottom:
                "1px solid rgba(148,163,253,0.10)",
            }}
          >
            <div>
              vs{" "}
              <span
                style={{
                  color: "#e5e7eb",
                  fontWeight: 600,
                  cursor: onOpponentClick
                    ? "pointer"
                    : "default",
                  textDecoration: onOpponentClick
                    ? "underline"
                    : "none",
                }}
                onClick={() =>
                  onOpponentClick?.(r.opponent)
                }
              >
                {r.opponent}
              </span>{" "}
              <span
                style={{
                  color: "#9ca3af",
                }}
              >
                — {r.status}
              </span>
              {r.url && (
                <a
                  href={r.url}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    marginLeft: "0.5rem",
                    color: "#f97316",
                    fontWeight: 500,
                  }}
                >
                  view
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </>
  );
};
