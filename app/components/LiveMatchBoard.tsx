"use client";

import useSWR from "swr";

type Player = {
  name: string;
  isStarter: boolean;
  isGoalkeeper: boolean;
  goals: number;
  fouls: number;
  yellowCards: number;
  redCards: number;
};

type Team = {
  key: "A" | "B";
  name: string;
  color: string;
  score: number;
  teamFouls: number;
  yellowCards: number;
  redCards: number;
  players: Player[];
};

type MatchData = {
  title: string;
  slotMinutes: number;
  elapsedMinutes: number;
  teams: Team[];
  events: Array<{
    minute: number;
    teamKey: "A" | "B";
    playerName: string;
    type: "goal" | "foul" | "yellow" | "red";
    createdAt: string;
  }>;
};

const fetcher = async (url: string): Promise<MatchData> => {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("Could not load match");
  }

  return response.json();
};

function statColor(type: string) {
  if (type === "goal") return "text-emerald-300";
  if (type === "foul") return "text-rose-300";
  if (type === "yellow") return "text-yellow-300";
  return "text-red-300";
}

function eventLabel(type: string) {
  if (type === "goal") return "GOAL";
  if (type === "foul") return "FOUL";
  if (type === "yellow") return "YELLOW";
  return "RED";
}

export default function LiveMatchBoard() {
  const { data, error } = useSWR("/api/match", fetcher, {
    refreshInterval: 2500,
    revalidateOnFocus: true,
  });

  if (error) {
    return (
      <div className="mx-auto mt-16 w-full max-w-6xl px-4 text-center text-rose-200">
        Could not load match data.
      </div>
    );
  }

  if (!data) {
    return (
      <div className="mx-auto mt-16 w-full max-w-6xl px-4 text-center text-emerald-100">
        Loading live match atmosphere...
      </div>
    );
  }

  const [teamA, teamB] = data.teams;
  const progress = Math.min((data.elapsedMinutes / data.slotMinutes) * 100, 100);

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-6 md:py-10">
      <section className="glass-card slide-in overflow-hidden rounded-3xl p-5 md:p-7">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs tracking-[0.3em] text-emerald-200/80">LIVE FUTSAL SESSION</p>
            <h1 className="text-4xl leading-none text-white md:text-6xl">{data.title}</h1>
          </div>
          <div className="rounded-xl border border-white/20 bg-black/20 px-4 py-2 text-sm text-emerald-100">
            Slot: {data.slotMinutes} min | Elapsed: {data.elapsedMinutes} min
          </div>
        </div>

        <div className="mb-5 h-3 overflow-hidden rounded-full bg-black/40">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-teal-300 to-orange-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="score-glow-a rounded-2xl bg-emerald-900/30 p-5 text-center">
            <h2 className="text-4xl text-white">{teamA.name}</h2>
            <p className="mt-2 text-6xl leading-none text-emerald-200">{teamA.score}</p>
            <p className="mt-2 text-sm text-emerald-100/90">Fouls {teamA.teamFouls} | YC {teamA.yellowCards} | RC {teamA.redCards}</p>
          </div>
          <div className="flex items-center justify-center rounded-2xl border border-white/15 bg-black/35 p-5 text-center">
            <div>
              <p className="text-xs tracking-[0.4em] text-white/60">MATCHUP</p>
              <p className="text-5xl text-white">VS</p>
            </div>
          </div>
          <div className="score-glow-b rounded-2xl bg-orange-900/30 p-5 text-center">
            <h2 className="text-4xl text-white">{teamB.name}</h2>
            <p className="mt-2 text-6xl leading-none text-orange-200">{teamB.score}</p>
            <p className="mt-2 text-sm text-orange-100/90">Fouls {teamB.teamFouls} | YC {teamB.yellowCards} | RC {teamB.redCards}</p>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="glass-card slide-in rounded-3xl p-5 md:p-6">
          <h3 className="mb-4 text-3xl text-white">Starting 6 On The Ground</h3>
          <div className="pitch relative grid gap-4 rounded-3xl p-4 md:grid-cols-2 md:p-6">
            {[teamA, teamB].map((team, teamIndex) => (
              <div key={team.key} className="relative rounded-2xl border border-white/20 bg-black/25 p-4">
                <p className="mb-3 text-xl text-white">{team.name}</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {team.players
                    .filter((player) => player.isStarter)
                    .map((player, index) => (
                      <div
                        key={player.name}
                        className="orb rounded-xl border border-white/15 bg-white/10 px-2 py-2 text-white"
                        style={{ animationDelay: `${index * 0.15 + teamIndex * 0.2}s` }}
                      >
                        <div className="font-semibold uppercase tracking-wide">
                          {player.name}
                          {player.isGoalkeeper ? " (GK)" : ""}
                        </div>
                        <div className="text-xs text-white/75">G {player.goals} | F {player.fouls}</div>
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card slide-in rounded-3xl p-5 md:p-6">
          <h3 className="mb-4 text-3xl text-white">Live Event Feed</h3>
          <div className="space-y-2">
            {data.events.length === 0 ? (
              <p className="rounded-xl border border-white/10 bg-black/20 p-3 text-sm text-white/80">
                No events yet. Admin updates will appear live here.
              </p>
            ) : (
              data.events.slice(0, 14).map((event, index) => (
                <div
                  key={`${event.createdAt}-${index}`}
                  className="rounded-xl border border-white/12 bg-black/25 p-3 text-sm"
                >
                  <p className="text-white/85">
                    <span className="font-semibold text-white">{event.minute}'</span> {event.playerName} ({event.teamKey})
                  </p>
                  <p className={`${statColor(event.type)} text-xs tracking-[0.25em]`}>
                    {eventLabel(event.type)}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
