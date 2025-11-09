import { useState } from "react";
import {
  getChampionshipTeamsIndex,
  getTeamStats,
  type FaceitTeamStats,
  type LeagueTeamSummary,
} from "./api/faceit";
import { LeagueMapSummary } from "./components/LeagueMapSummary/LeagueMapSummary";
import "./App.css";

const ESEA_S55_CHAMPIONSHIP_ID =
  "4e4b0ed1-7b4a-4bb5-8a67-d51ee1e1f78f";

type LeagueRecord = {
  wins: number;
  losses: number;
  ties: number;
  total: number;
};

function App() {
  const [query, setQuery] = useState("");
  const [teams, setTeams] = useState<LeagueTeamSummary[]>([]);
  const [selectedTeam, setSelectedTeam] =
    useState<LeagueTeamSummary | null>(null);
  const [stats, setStats] = useState<FaceitTeamStats | null>(null);
  const [record, setRecord] = useState<LeagueRecord | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    setError("");
    setTeams([]);
    setSelectedTeam(null);
    setStats(null);
    setRecord(null);

    const q = query.trim();
    if (!q) return;

    try {
      setLoading(true);
      const leagueTeams = await getChampionshipTeamsIndex(
        ESEA_S55_CHAMPIONSHIP_ID
      );
      console.log("Loaded league teams:", leagueTeams.length);

      const filtered = leagueTeams.filter((t) =>
        t.name.toLowerCase().includes(q.toLowerCase())
      );

      if (!filtered.length) {
        setError("No IM league teams found with that name.");
      }

      setTeams(filtered);
    } catch (e: any) {
      setError(e.message || "Failed to search league teams.");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTeam = async (team: LeagueTeamSummary) => {
    setSelectedTeam(team);
    setStats(null);
    setRecord(null);
    setError("");

    try {
      setLoading(true);
      const s = await getTeamStats(team.team_id, "cs2");
      setStats(s);
    } catch (e: any) {
      if (e.message === "NOT_FOUND") {
        setError("This team has no CS2 stats on FACEIT.");
      } else {
        setError(e.message || "Failed to load team stats.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOpponentClick = async (opponentName: string) => {
    if (!opponentName) return;
    setError("");
    setQuery(opponentName);

    try {
      const leagueTeams = await getChampionshipTeamsIndex(
        ESEA_S55_CHAMPIONSHIP_ID
      );

      const normalized = opponentName.toLowerCase().trim();

      const matchExact =
        leagueTeams.find((t) => t.name.toLowerCase() === normalized) || null;

      const matchPartial =
        matchExact ||
        leagueTeams.find((t) =>
          t.name.toLowerCase().includes(normalized)
        ) ||
        null;

      if (!matchPartial) {
        setError(`Could not find "${opponentName}" in this league.`);
        return;
      }

      setTeams([matchPartial]);
      await handleSelectTeam(matchPartial);
    } catch (e: any) {
      setError(
        e.message || "Failed to load opponent team from league index."
      );
    }
  };

  return (
    <div className="app">
      <div className="card">
        <h1
          style={{
            fontSize: "2.1rem",
            marginBottom: "0.4rem",
          }}
        >
          FACEIT ESEA League Stats (CS2)
        </h1>
        <p
          style={{
            fontSize: "0.98rem",
            color: "#9ca3af",
            marginBottom: "1.4rem",
          }}
        >
          Search a team from{" "}
          <strong>S55 NA Intermediate Central - Regular Season</strong>, then
          view its season record, league maps, locations, lineup stats, and
          match breakdown.
        </p>

        {/* Search */}
        <div className="search-bar">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="e.g. Desi Boyz v6, three11, DUI..."
          />
          <button onClick={handleSearch} disabled={loading}>
            {loading ? "Loading..." : "Search"}
          </button>
        </div>

        {/* Error */}
        {error && <div className="error">{error}</div>}

        {/* Team list */}
        {teams.length > 0 && (
          <div className="team-list">
            <div className="label">Select a team:</div>
            {teams.map((team) => (
              <button
                key={team.team_id}
                onClick={() => handleSelectTeam(team)}
                className={`team-item ${
                  selectedTeam?.team_id === team.team_id ? "active" : ""
                }`}
              >
                {team.avatar && (
                  <img src={team.avatar} alt={team.name} />
                )}
                <span className="team-name">{team.name}</span>
                <span className="team-meta">
                  {(team.game || "cs2").toUpperCase()}
                  {team.verified ? " • Verified" : ""}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Team stats + league breakdown */}
        {selectedTeam && stats && (
          <div className="stats-card">
            <div className="team-header">
              {selectedTeam.avatar && (
                <img
                  src={selectedTeam.avatar}
                  alt={selectedTeam.name}
                />
              )}
              <div>
                <div
                  className="team-title"
                  style={{ fontSize: "1.6rem" }}
                >
                  {selectedTeam.name}
                </div>
                <div className="team-subtitle">
                  Team ID: {stats.team_id} • Game:{" "}
                  {stats.game_id?.toUpperCase()}
                </div>
                {record && (
                  <div className="record-pill">
                    S55 Record:&nbsp;
                    <strong>
                      {record.wins}-{record.losses}
                      {record.ties ? `-${record.ties}` : ""}
                    </strong>
                    <span className="record-total">
                      {" "}
                      ({record.total} played)
                    </span>
                  </div>
                )}
              </div>
            </div>

            <LeagueMapSummary
              teamId={selectedTeam.team_id}
              teamName={selectedTeam.name}
              championshipId={ESEA_S55_CHAMPIONSHIP_ID}
              title="S55 NA Intermediate Central - Regular Season"
              onRecordUpdate={setRecord}
              onOpponentClick={handleOpponentClick}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
