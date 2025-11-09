// src/components/LeagueMapSummary/FinishedMatches.tsx

import React from "react";
import type { LeagueMatchView } from "../../types/league";
import {
  upsertManualMatchVeto,
  type ManualMatchVeto,
  getManualVetoesForTeam,
} from "../../scouting/manualOpponentVetoStore";
import { parseVetoLogForTeam } from "../../scouting/parseVetoLog";

interface FinishedMatchesProps {
  matches: LeagueMatchView[];
  onOpponentClick?: (
    opponentName: string
  ) => Promise<void> | void;

  // Team we are scouting on this page
  teamId: string;
  teamName: string;

  // Notify parent to recompute summary
  onVetoUpdate?: () => void;
}

interface MatchRowProps {
  match: LeagueMatchView;
  teamId: string;
  teamName: string;
  onOpponentClick?: (
    opponentName: string
  ) => Promise<void> | void;
  onVetoUpdate?: () => void;
}

const scoutedPillStyle: React.CSSProperties = {
  padding: "0.18rem 0.6rem",
  borderRadius: "999px",
  border: "1px solid rgba(34,197,94,0.45)",
  fontSize: "0.78rem",
  color: "#22c55e",
  display: "inline-flex",
  alignItems: "center",
  gap: "0.3rem",
  background: "rgba(22,163,74,0.10)",
  whiteSpace: "nowrap",
};

const MatchRow: React.FC<MatchRowProps> = ({
  match,
  teamId,
  teamName,
  onOpponentClick,
  onVetoUpdate,
}) => {
  const [vetoInput, setVetoInput] = React.useState("");
  const [saved, setSaved] = React.useState(false);
  const [scouted, setScouted] = React.useState(false);
  const detailsRef =
    React.useRef<HTMLDetailsElement | null>(null);

  // On mount: check if this match already has saved veto data
  React.useEffect(() => {
    (async () => {
      const existing = await getManualVetoesForTeam(
        teamId
      );
      const isScouted = existing.some(
        (v) => v.matchId === match.matchId
      );
      if (isScouted) setScouted(true);
    })();
  }, [teamId, match.matchId]);

  const isWin = match.outcome === "win";
  const isLoss = match.outcome === "loss";
  const scoreColor = isWin
    ? "#22c55e"
    : isLoss
    ? "#ef4444"
    : "#e5e7eb";

  const scoreText =
    match.ourScore !== undefined &&
    match.oppScore !== undefined
      ? `${match.ourScore}:${match.oppScore}`
      : "";

  const outcomeLabel =
    match.outcome === "win"
      ? " (Win)"
      : match.outcome === "loss"
      ? " (Loss)"
      : "";

  const handleSaveVeto = async () => {
    if (!vetoInput.trim()) return;

    const actions = parseVetoLogForTeam(
      vetoInput,
      teamName
    );

    if (!actions.length) {
      alert(
        `No veto actions detected for "${teamName}". Make sure their lines are in the pasted log.`
      );
      return;
    }

    const entry: ManualMatchVeto = {
      matchId: match.matchId,
      teamId,
      teamName,
      actions,
    };

    try {
      await upsertManualMatchVeto(entry);

      setSaved(true);
      setScouted(true);
      setVetoInput("");

      if (detailsRef.current) {
        detailsRef.current.open = false;
      }

      setTimeout(() => setSaved(false), 1200);

      onVetoUpdate?.();
    } catch (e) {
      console.error(e);
      alert("Failed to save veto to server.");
    }
  };

  return (
    <div
      style={{
        padding: "0.6rem 0",
        borderBottom:
          "1px solid rgba(255,255,255,0.06)",
      }}
    >
      {/* Header row: left = info, right = status */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: "0.75rem",
          flexWrap: "wrap",
        }}
      >
        {/* Left side: opponent, score, link */}
        <div
          style={{
            flex: 1,
            minWidth: 0,
          }}
        >
          <div>
            vs{" "}
            <span
              style={{
                fontWeight: 600,
                cursor: onOpponentClick
                  ? "pointer"
                  : "default",
                textDecoration:
                  onOpponentClick
                    ? "underline"
                    : "none",
              }}
              onClick={() =>
                onOpponentClick?.(
                  match.opponent
                )
              }
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
                  fontSize:
                    "0.8rem",
                }}
              >
                view
              </a>
            )}
          </div>
        </div>

        {/* Right side: scouted pill */}
        {scouted && (
          <div style={scoutedPillStyle}>
            <span
              style={{
                width: "6px",
                height: "6px",
                borderRadius:
                  "999px",
                backgroundColor:
                  "#22c55e",
              }}
            />
            <span>Scouted</span>
            <span>✓</span>
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
          <span
            style={{
              color: "#e5e7eb",
            }}
          >
            {match.picked.length
              ? match.picked.join(
                  ", "
                )
              : "No map info exposed by API"}
          </span>
        </div>

        <div>
          <span>
            Excluded maps:{" "}
          </span>
          <span
            style={{
              color: "#e5e7eb",
            }}
          >
            {match.banned.length
              ? match.banned.join(
                  ", "
                )
              : match.picked.length
              ? "Bans not exposed by API"
              : "Match not played"}
          </span>
        </div>

        {match.locations.length >
          0 && (
          <div>
            <span>
              Location:{" "}
            </span>
            <span
              style={{
                color: "#e5e7eb",
              }}
            >
              {match.locations.join(
                ", "
              )}
            </span>
          </div>
        )}
      </div>

      {/* Manual veto paste */}
      <div
        style={{
          marginTop: "0.45rem",
        }}
      >
        <details
          ref={detailsRef}
          style={{
            padding:
              "0.35rem 0.5rem",
            borderRadius:
              "0.6rem",
            background:
              "rgba(7,11,19,0.96)",
            border:
              "1px solid rgba(51,65,85,0.85)",
          }}
        >
          <summary
            style={{
              cursor: "pointer",
              color: "#38bdf8",
              fontSize:
                "0.8rem",
              fontWeight: 500,
              listStyle:
                "none",
            }}
          >
            {scouted
              ? "Update veto log for this match"
              : "Add veto log for this match"}
          </summary>

          <textarea
            value={vetoInput}
            onChange={(e) =>
              setVetoInput(
                e.target
                  .value
              )
            }
            placeholder={`Paste the veto lines involving ${teamName} for this match. For example:
${teamName} banned Mirage
Other Team banned Inferno
${teamName} banned Nuke
Ancient picked by default`}
            rows={4}
            style={{
              width: "100%",
              marginTop:
                "0.4rem",
              borderRadius:
                "0.4rem",
              border:
                "1px solid rgba(75,85,99,0.7)",
              background:
                "rgba(9,9,11,0.98)",
              color: "#e5e7eb",
              fontSize:
                "0.78rem",
              padding:
                "0.35rem 0.45rem",
              resize:
                "vertical",
            }}
          />

          <div
            style={{
              marginTop:
                "0.35rem",
              display:
                "flex",
              alignItems:
                "center",
              gap: "0.5rem",
            }}
          >
            <button
              type="button"
              onClick={
                handleSaveVeto
              }
              style={{
                background:
                  "linear-gradient(to right, #38bdf8, #6366f1)",
                color:
                  "#020817",
                fontSize:
                  "0.75rem",
                border:
                  "none",
                borderRadius:
                  "999px",
                padding:
                  "0.28rem 0.8rem",
                cursor:
                  "pointer",
                fontWeight: 600,
              }}
            >
              Save veto log
            </button>
            {saved && (
              <span
                style={{
                  fontSize:
                    "0.72rem",
                  color:
                    "#22c55e",
                }}
              >
                ✓ Saved
              </span>
            )}
          </div>
        </details>
      </div>
    </div>
  );
};

export const FinishedMatches: React.FC<
  FinishedMatchesProps
> = ({
  matches,
  onOpponentClick,
  teamId,
  teamName,
  onVetoUpdate,
}) => {
  if (!matches.length) return null;

  return (
    <>
      <h4
        style={{
          marginTop: "1.2rem",
          marginBottom:
            "0.45rem",
          fontSize:
            "1.02rem",
          fontWeight: 600,
        }}
      >
        Match-by-match
        (finished)
      </h4>
      <div
        style={{
          fontSize:
            "0.95rem",
        }}
      >
        {matches.map((m) => (
          <MatchRow
            key={m.matchId}
            match={m}
            teamId={teamId}
            teamName={
              teamName
            }
            onOpponentClick={
              onOpponentClick
            }
            onVetoUpdate={
              onVetoUpdate
            }
          />
        ))}
      </div>
    </>
  );
};
