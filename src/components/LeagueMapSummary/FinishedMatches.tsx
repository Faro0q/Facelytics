// src/components/LeagueMapSummary/FinishedMatches.tsx

import React from "react";
import type { LeagueMatchView } from "../../types/league";

interface FinishedMatchesProps {
  matches: LeagueMatchView[];
  onOpponentClick?: (opponentName: string) => Promise<void> | void;

  // These are now unused (manual process removed),
  // but left optional to avoid breaking parent callers.
  teamId?: string;
  teamName?: string;
  onVetoUpdate?: () => void;
}

interface MatchRowProps {
  match: LeagueMatchView;
  onOpponentClick?: (opponentName: string) => Promise<void> | void;
}

const pillBase: React.CSSProperties = {
  padding: "0.18rem 0.6rem",
  borderRadius: "999px",
  fontSize: "0.78rem",
  display: "inline-flex",
  alignItems: "center",
  gap: "0.3rem",
  whiteSpace: "nowrap",
  border: "1px solid rgba(56,189,248,0.45)",
  color: "#38bdf8",
  background: "rgba(56,189,248,0.10)",
};

const MatchRow: React.FC<MatchRowProps> = ({ match, onOpponentClick }) => {
  const hasAutoVeto =
    (match.picked && match.picked.length > 0) ||
    (match.banned && match.banned.length > 0) ||
    (match.locations && match.locations.length > 0);

  const isWin = match.outcome === "win";
  const isLoss = match.outcome === "loss";
  const scoreColor = isWin ? "#22c55e" : isLoss ? "#ef4444" : "#e5e7eb";

  const scoreText =
    match.ourScore !== undefined && match.oppScore !== undefined
      ? `${match.ourScore}:${match.oppScore}`
      : "";

  const outcomeLabel =
    match.outcome === "win" ? " (Win)" : match.outcome === "loss" ? " (Loss)" : "";

  return (
    <div
      style={{
        padding: "0.6rem 0",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      {/* Header row: left = info, right = auto-veto pill (if present) */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: "0.75rem",
          flexWrap: "wrap",
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div>
            vs{" "}
            <span
              style={{
                fontWeight: 600,
                cursor: onOpponentClick ? "pointer" : "default",
                textDecoration: onOpponentClick ? "underline" : "none",
              }}
              onClick={() => onOpponentClick?.(match.opponent)}
            >
              {match.opponent}
            </span>
            {scoreText && (
              <span
                style={{
                  marginLeft: "0.25rem",
                  color: scoreColor,
                  fontWeight: 600,
                }}
              >
                — {scoreText}
                {outcomeLabel}
              </span>
            )}
            {match.url && (
              <a
                href={match.url}
                target="_blank"
                rel="noreferrer"
                style={{
                  marginLeft: "0.5rem",
                  color: "#f97316",
                  fontWeight: 500,
                  fontSize: "0.8rem",
                }}
              >
                view
              </a>
            )}
          </div>
        </div>

        {hasAutoVeto && (
          <div style={pillBase}>
            <span
              style={{
                width: "6px",
                height: "6px",
                borderRadius: "999px",
                backgroundColor: "#38bdf8",
              }}
            />
            Auto veto
          </div>
        )}
      </div>

      {/* Maps / bans / locations */}
      <div
        style={{
          marginTop: "0.2rem",
          fontSize: "0.85rem",
          color: "#9ca3af",
        }}
      >
        <div>
          <span>Played map(s): </span>
          <span style={{ color: "#e5e7eb" }}>
            {match.picked.length ? match.picked.join(", ") : "No map info"}
          </span>
        </div>

        <div>
          <span>Excluded maps: </span>
          <span style={{ color: "#e5e7eb" }}>
            {match.banned.length
              ? match.banned.join(", ")
              : match.picked.length
              ? "Bans not exposed by API"
              : "Match not played"}
          </span>
        </div>

        {match.locations.length > 0 && (
          <div>
            <span>Location: </span>
            <span style={{ color: "#e5e7eb" }}>{match.locations.join(", ")}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export const FinishedMatches: React.FC<FinishedMatchesProps> = ({
  matches,
  onOpponentClick,
}) => {
  if (!matches.length) return null;

  return (
    <>
      <h4
        style={{
          marginTop: "1.2rem",
          marginBottom: "0.45rem",
          fontSize: "1.02rem",
          fontWeight: 600,
        }}
      >
        Match-by-match (finished)
      </h4>
      <div style={{ fontSize: "0.95rem" }}>
        {matches.map((m) => (
          <MatchRow key={m.matchId} match={m} onOpponentClick={onOpponentClick} />
        ))}
      </div>
    </>
  );
};
