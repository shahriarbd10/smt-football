"use client";

import { FormEvent, useMemo, useState } from "react";
import useSWR from "swr";

type Player = {
  name: string;
  isStarter: boolean;
  isGoalkeeper: boolean;
};

type Team = {
  key: "A" | "B";
  name: string;
  score: number;
  players: Player[];
};

type MatchData = {
  elapsedMinutes: number;
  slotMinutes: number;
  teams: Team[];
};

const fetcher = async (url: string): Promise<MatchData> => {
  const response = await fetch(url);

  if (response.status === 401) {
    throw new Error("UNAUTHORIZED");
  }

  if (!response.ok) {
    throw new Error("Could not load admin data");
  }

  return response.json();
};

async function patchMatch(payload: Record<string, unknown>) {
  const response = await fetch("/api/admin/match", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.error || "Request failed");
  }

  return data;
}

export default function AdminPanel() {
  const { data, error, mutate, isLoading } = useSWR("/api/admin/match", fetcher);

  const [email, setEmail] = useState("smtfootball@admin.com");
  const [password, setPassword] = useState("123456");
  const [selectedTeam, setSelectedTeam] = useState<"A" | "B">("A");
  const [playerName, setPlayerName] = useState("");
  const [minute, setMinute] = useState(1);
  const [eventType, setEventType] = useState<"goal" | "foul" | "yellow" | "red">("goal");
  const [message, setMessage] = useState("");

  const unauthorized = error?.message === "UNAUTHORIZED";

  const players = useMemo(() => {
    const team = data?.teams.find((item) => item.key === selectedTeam);
    return team?.players || [];
  }, [data?.teams, selectedTeam]);

  async function login(e: FormEvent) {
    e.preventDefault();

    const response = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      setMessage("Login failed.");
      return;
    }

    setMessage("Admin access granted.");
    await mutate();
  }

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    setMessage("Logged out.");
    await mutate(undefined, { revalidate: true });
  }

  async function updateClock(elapsedMinutes: number) {
    try {
      await patchMatch({ action: "setElapsedMinutes", elapsedMinutes });
      setMessage("Clock updated.");
      await mutate();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Clock update failed.");
    }
  }

  async function updateScore(teamKey: "A" | "B", score: number) {
    try {
      await patchMatch({ action: "setScore", teamKey, score });
      setMessage("Score updated.");
      await mutate();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Score update failed.");
    }
  }

  async function submitEvent(e: FormEvent) {
    e.preventDefault();

    if (!playerName) {
      setMessage("Select a player first.");
      return;
    }

    try {
      await patchMatch({
        action: "recordEvent",
        teamKey: selectedTeam,
        playerName,
        type: eventType,
        minute,
      });

      setMessage("Event recorded.");
      await mutate();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Event failed.");
    }
  }

  async function saveLineup(team: Team) {
    const starters = team.players.filter((p) => p.isStarter).map((p) => p.name);
    const goalkeeper = team.players.find((p) => p.isGoalkeeper)?.name;

    if (!goalkeeper) {
      setMessage("Select one goalkeeper for this team.");
      return;
    }

    try {
      await patchMatch({
        action: "setLineup",
        teamKey: team.key,
        starters,
        goalkeeper,
      });
      setMessage(`${team.name} lineup saved.`);
      await mutate();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not save lineup.");
    }
  }

  if (unauthorized) {
    return (
      <main className="mx-auto flex w-full max-w-lg flex-1 items-center justify-center px-4 py-10">
        <form onSubmit={login} className="glass-card w-full rounded-3xl p-6">
          <p className="text-xs tracking-[0.3em] text-emerald-200/80">ADMIN ACCESS</p>
          <h1 className="mt-1 text-4xl text-white">SMT Match Control</h1>

          <div className="mt-5 space-y-3">
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-white/20 bg-black/25 px-3 py-2 text-white outline-none"
              placeholder="Email"
            />
            <input
              value={password}
              type="password"
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-white/20 bg-black/25 px-3 py-2 text-white outline-none"
              placeholder="Password"
            />
            <button className="w-full rounded-xl bg-emerald-500 px-4 py-2 font-semibold text-black">Log In</button>
          </div>

          {message ? <p className="mt-3 text-sm text-emerald-100">{message}</p> : null}
        </form>
      </main>
    );
  }

  if (isLoading || !data) {
    return <main className="mx-auto w-full max-w-6xl px-4 py-10 text-emerald-100">Loading admin panel...</main>;
  }

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-5 px-4 py-8">
      <section className="glass-card rounded-3xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs tracking-[0.3em] text-emerald-200/80">ADMIN PANEL</p>
            <h1 className="text-5xl text-white">Live Match Controls</h1>
          </div>
          <button onClick={logout} className="rounded-xl border border-white/20 bg-black/30 px-4 py-2 text-white">
            Logout
          </button>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-xl border border-white/15 bg-black/20 p-3">
            <p className="text-sm text-white/80">Elapsed Minutes</p>
            <div className="mt-2 flex gap-2">
              <input
                type="number"
                min={0}
                max={data.slotMinutes}
                defaultValue={data.elapsedMinutes}
                onBlur={(e) => updateClock(Number(e.target.value))}
                className="w-full rounded-lg border border-white/20 bg-black/20 px-2 py-1 text-white"
              />
            </div>
          </div>

          {data.teams.map((team) => (
            <div key={team.key} className="rounded-xl border border-white/15 bg-black/20 p-3">
              <p className="text-sm text-white/80">{team.name} Score</p>
              <input
                type="number"
                min={0}
                defaultValue={team.score}
                onBlur={(e) => updateScore(team.key, Number(e.target.value))}
                className="mt-2 w-full rounded-lg border border-white/20 bg-black/20 px-2 py-1 text-white"
              />
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-[1fr_1.3fr]">
        <form onSubmit={submitEvent} className="glass-card rounded-3xl p-5">
          <h2 className="text-3xl text-white">Record Event</h2>
          <div className="mt-4 space-y-3 text-sm">
            <select
              value={selectedTeam}
              onChange={(e) => {
                setSelectedTeam(e.target.value as "A" | "B");
                setPlayerName("");
              }}
              className="w-full rounded-lg border border-white/20 bg-black/25 px-3 py-2 text-white"
            >
              {data.teams.map((team) => (
                <option key={team.key} value={team.key}>
                  {team.name}
                </option>
              ))}
            </select>

            <select
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              className="w-full rounded-lg border border-white/20 bg-black/25 px-3 py-2 text-white"
            >
              <option value="">Select player</option>
              {players.map((player) => (
                <option key={player.name} value={player.name}>
                  {player.name}
                </option>
              ))}
            </select>

            <div className="grid grid-cols-2 gap-2">
              <select
                value={eventType}
                onChange={(e) => setEventType(e.target.value as "goal" | "foul" | "yellow" | "red")}
                className="rounded-lg border border-white/20 bg-black/25 px-3 py-2 text-white"
              >
                <option value="goal">Goal</option>
                <option value="foul">Foul</option>
                <option value="yellow">Yellow Card</option>
                <option value="red">Red Card</option>
              </select>
              <input
                type="number"
                min={0}
                max={90}
                value={minute}
                onChange={(e) => setMinute(Number(e.target.value))}
                className="rounded-lg border border-white/20 bg-black/25 px-3 py-2 text-white"
              />
            </div>

            <button className="w-full rounded-xl bg-orange-400 px-4 py-2 font-semibold text-black">Add Event</button>
          </div>
        </form>

        <div className="glass-card rounded-3xl p-5">
          <h2 className="text-3xl text-white">Lineup Manager</h2>
          <p className="mb-4 text-sm text-white/70">Pick exactly 6 starters including 1 goalkeeper per team.</p>

          <div className="grid gap-4 md:grid-cols-2">
            {data.teams.map((team) => (
              <div key={team.key} className="rounded-2xl border border-white/15 bg-black/20 p-4">
                <p className="text-2xl text-white">{team.name}</p>
                <div className="mt-3 space-y-2 text-sm">
                  {team.players.map((player) => (
                    <div key={player.name} className="flex items-center gap-2 rounded-lg border border-white/10 px-2 py-1 text-white">
                      <span className="min-w-20">{player.name}</span>
                      <label className="ml-auto flex items-center gap-1 text-xs">
                        <input
                          type="checkbox"
                          checked={player.isStarter}
                          onChange={(e) => {
                            const updated = data.teams.map((item) => {
                              if (item.key !== team.key) return item;
                              return {
                                ...item,
                                players: item.players.map((p) =>
                                  p.name === player.name ? { ...p, isStarter: e.target.checked } : p,
                                ),
                              };
                            });
                            mutate({ ...data, teams: updated }, false);
                          }}
                        />
                        Starter
                      </label>

                      <label className="flex items-center gap-1 text-xs">
                        <input
                          type="radio"
                          name={`gk-${team.key}`}
                          checked={player.isGoalkeeper}
                          onChange={(e) => {
                            if (!e.target.checked) return;
                            const updated = data.teams.map((item) => {
                              if (item.key !== team.key) return item;
                              return {
                                ...item,
                                players: item.players.map((p) => ({
                                  ...p,
                                  isGoalkeeper: p.name === player.name,
                                })),
                              };
                            });
                            mutate({ ...data, teams: updated }, false);
                          }}
                        />
                        GK
                      </label>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => saveLineup(team)}
                  className="mt-3 w-full rounded-lg border border-white/20 bg-emerald-500/80 px-3 py-2 text-sm font-semibold text-black"
                >
                  Save {team.name} Lineup
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {message ? <p className="rounded-xl border border-white/15 bg-black/20 px-3 py-2 text-sm text-white">{message}</p> : null}
    </main>
  );
}
