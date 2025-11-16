import React, { useEffect } from "react";
import { useLeagueMapSummary } from "../../hooks/useLeagueMapSummary";
import { PlayerMapCard } from "./PlayerMapCard";
import { MapsPlayed } from "./MapsPlayed";
import { LocationsPlayed } from "./LocationsPlayed";
import { UpcomingMatches } from "./UpcomingMatches";
import { FinishedMatches } from "./FinishedMatches";
import type { LeagueMatchView } from "../../types/league";
import { VetoTendencies } from "./VetoTendencies";

interface LeagueMapSummaryProps {
  teamId: string;
  teamName: string;
  championshipId: string;
  title?: string;
  onRecordUpdate?: (
    record:
      | {
          wins: number;
          losses: number;
          ties: number;
          total: number;
        }
      | null
  ) => void;
  onOpponentClick?: (opponentName: string) => Promise<void> | void;
}

export const LeagueMapSummary: React.FC<LeagueMapSummaryProps> = ({
  teamId,
  teamName,
  championshipId,
  title,
  onRecordUpdate,
  onOpponentClick,
}) => {
  const {
    loading,
    error,
    rows,
    mapStats,
    leagueName,
    locations,
    players,
    playerMapStats,
  } = useLeagueMapSummary({
    teamId,
    championshipId,
    title,
  });

  // Compute W/L/T record from finished matches
  useEffect(() => {
    if (!onRecordUpdate) return;

    const finishedMatches = rows.filter((r) => r.status === "FINISHED");
    if (!finishedMatches.length) {
      onRecordUpdate(null);
      return;
    }

    let wins = 0;
    let losses = 0;
    let ties = 0;

    finishedMatches.forEach((m) => {
      if (m.outcome === "win") wins += 1;
      else if (m.outcome === "loss") losses += 1;
      else if (m.outcome === "tie") ties += 1;
    });

    onRecordUpdate({
      wins,
      losses,
      ties,
      total: wins + losses + ties,
    });
  }, [rows, onRecordUpdate]);

  if (loading) {
    return <div className="stats-card">Loading league matches…</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  if (!rows.length) return null;

  const headerTitle = leagueName || title || "League matches overview";

  const finished: LeagueMatchView[] = rows.filter(
    (r) => r.status === "FINISHED"
  );
  const upcoming: LeagueMatchView[] = rows.filter(
    (r) => r.status !== "FINISHED"
  );

  const finishedSorted = [...finished].sort(
    (a, b) => (b.sortKey || 0) - (a.sortKey || 0)
  );
  const upcomingSorted = [...upcoming].sort(
    (a, b) => (a.sortKey || 0) - (b.sortKey || 0)
  );

  const sortedPlayerSummaries = [...playerMapStats].sort((a, b) =>
    (a.nickname || "").localeCompare(b.nickname || "")
  );

  return (
    <div
      className="stats-card"
      style={{
        marginTop: "1.5rem",
        fontSize: "1rem",
        padding: "1.6rem 1.8rem",
        width: "100%",
        boxSizing: "border-box",
        background: "rgba(9,9,11,0.98)",
        borderRadius: "1.2rem",
        border: "1px solid rgba(75,85,99,0.9)",
      }}
    >
      <h3
        style={{
          fontSize: "1.5rem",
          marginBottom: "0.2rem",
          fontWeight: 600,
        }}
      >
        {teamName}
      </h3>
      <div
        style={{
          fontSize: "0.9rem",
          color: "#9ca3af",
          marginBottom: "0.8rem",
        }}
      >
        {headerTitle}
      </div>

      {/* Team lineup & performance */}
      {sortedPlayerSummaries.length > 0 && (
        <>
          <h4
            style={{
              marginBottom: "0.45rem",
              fontSize: "1.1rem",
              fontWeight: 600,
            }}
          >
            Team lineup & league performance
          </h4>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
              gap: "1rem",
            }}
          >
            {sortedPlayerSummaries.map((p) => (
              <PlayerMapCard key={p.playerId} summary={p} players={players} />
            ))}
          </div>
        </>
      )}

      {/* API-based stats */}
      <MapsPlayed mapStats={mapStats} />
      <LocationsPlayed locations={locations} />
      <VetoTendencies
        teamId={teamId}
        teamName={teamName}
        matches={finishedSorted}
      />

      <UpcomingMatches
        matches={upcomingSorted}
        onOpponentClick={onOpponentClick}
      />
      <FinishedMatches
        matches={finishedSorted}
        onOpponentClick={onOpponentClick}
      />
    </div>
  );
};
