// src/components/LeagueMapSummary/PlayerMapCard.tsx

import React from "react";
import type {
  PlayerMapSummary,
  PlayerView,
} from "../../types/league";

interface PlayerMapCardProps {
  summary: PlayerMapSummary;
  players: PlayerView[];
}

export const PlayerMapCard: React.FC<PlayerMapCardProps> = ({
  summary,
  players,
}) => {
  const base = players.find(
    (bp) =>
      bp.playerId === summary.playerId ||
      bp.nickname.toLowerCase() ===
        summary.nickname.toLowerCase()
  );
  const elo = base?.faceitElo;

  let totalKills = 0;
  let totalDeaths = 0;
  let totalAdr = 0;
  let totalRounds = 0;

  Object.values(summary.maps).forEach((m) => {
    totalKills += m.kills;
    totalDeaths += m.deaths;
    totalAdr += m.adrSum;
    totalRounds += m.rounds;
  });

  const kd =
    totalDeaths > 0
      ? (totalKills / totalDeaths).toFixed(2)
      : totalKills > 0
      ? "∞"
      : "-";

  const adr =
    totalRounds > 0
      ? (totalAdr / totalRounds).toFixed(1)
      : "-";

  const perMapEntries = Object.entries(summary.maps);

  return (
    <div
      style={{
        padding: "0.9rem 1rem",
        borderRadius: "0.9rem",
        background: "rgba(6,8,16,0.98)",
        border: "1px solid rgba(51,65,85,0.9)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          marginBottom: "0.3rem",
        }}
      >
        <div
          style={{
            fontWeight: 700,
            fontSize: "1.1rem",
            color: "#e5e7eb",
          }}
        >
          {summary.nickname}
        </div>
        {elo && (
          <div
            style={{
              fontSize: "1.05rem",
              color: "#38bdf8",
              fontWeight: 700,
            }}
          >
            {elo} ELO
          </div>
        )}
      </div>

      <div
        style={{
          display: "flex",
          gap: "1rem",
          fontSize: "0.9rem",
          marginBottom: "0.25rem",
        }}
      >
        <StatBlock label="K / D">
          {totalKills}/{totalDeaths}
        </StatBlock>
        <StatBlock label="K/D">{kd}</StatBlock>
        <StatBlock label="ADR">{adr}</StatBlock>
      </div>

      {perMapEntries.length > 0 && (
        <div
          style={{
            marginTop: "0.15rem",
            fontSize: "0.8rem",
            color: "#9ca3af",
            display: "flex",
            flexDirection: "column",
            gap: "0.1rem",
          }}
        >
          {perMapEntries
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([mapName, m]) => {
              const mkd =
                m.deaths > 0
                  ? (m.kills / m.deaths).toFixed(2)
                  : m.kills > 0
                  ? "∞"
                  : "-";
              const madr =
                m.rounds > 0
                  ? (m.adrSum / m.rounds).toFixed(1)
                  : "-";

              return (
                <div
                  key={mapName}
                  style={{ whiteSpace: "nowrap" }}
                >
                  <span
                    style={{
                      color: "#e5e7eb",
                    }}
                  >
                    {mapName}:
                  </span>{" "}
                  {m.kills}/{m.deaths} • K/D {mkd} • ADR{" "}
                  {madr}
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
};

const StatBlock: React.FC<{
  label: string;
  children: React.ReactNode;
}> = ({ label, children }) => (
  <div>
    <div
      style={{
        color: "#9ca3af",
        fontSize: "0.8rem",
      }}
    >
      {label}
    </div>
    <div
      style={{
        fontWeight: 600,
      }}
    >
      {children}
    </div>
  </div>
);
