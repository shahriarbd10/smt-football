"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import { motion, AnimatePresence } from "framer-motion";
import {
  Trophy,
  Activity,
  AlertCircle,
  Zap,
  Target,
  History,
  TrendingUp,
  ShieldAlert,
  Calendar,
  Shield,
  Clock3,
  ArrowRight,
  LayoutGrid,
  Timer,
  Users,
  Flag,
  CircleCheck,
  CircleSlash,
} from "lucide-react";
import { MatchStatCard } from "./shared/MatchStatCard";
import { TacticalCanvas } from "./shared/TacticalCanvas";
import PhotoGallery from "./PhotoGallery";
import { SpecialMatchFormationPitch, type SpecialFormationPlayer } from "./shared/SpecialMatchFormationPitch";

type Player = {
  name: string;
  isStarter: boolean;
  isGoalkeeper: boolean;
  goals: number;
  fouls: number;
  yellowCards: number;
  redCards: number;
  assists: number;
  imageUrl?: string;
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

type MatchEvent = {
  minute: number;
  matchId?: string;
  matchTitle?: string;
  teamKey: "A" | "B";
  playerName: string;
  type: "goal" | "assist" | "foul" | "yellow" | "red";
  createdAt: string;
};

type MatchRecord = {
  id: string;
  title: string;
  playersPerSide: 6 | 7;
  slotMinutes: number;
  elapsedMinutes: number;
  teams: Team[];
  events: MatchEvent[];
  kickoffTime: string;
  updatedAt: string;
};

type UpcomingEventMemberStatus = {
  memberId: string;
  confirmed: boolean;
  paymentStatus: "paid" | "unpaid" | "pending";
  paidAmount: number;
};

type UpcomingEvent = {
  id: string;
  title: string;
  eventDate: string;
  slotMinutes: number;
  totalSlotFee: number;
  notes?: string;
  participants: UpcomingEventMemberStatus[];
};

type Member = {
  id: string;
  name: string;
};

type MatchData = {
  title: string;
  isLiveContext?: boolean;
  currentMatchId?: string;
  currentMatchTitle?: string;
  specialEvent?: {
    enabled: boolean;
    title: string;
    subtitle: string;
    eventDate: string;
    homeTeamName: string;
    awayTeamName: string;
    badgeText: string;
    venue: string;
    squad: {
      gk: string[];
      cb: string[];
      cmf: string[];
      cf: string[];
    };
    formationPlayers: SpecialFormationPlayer[];
  };
  playersPerSide: 6 | 7;
  slotMinutes: number;
  elapsedMinutes: number;
  teams: Team[];
  events: MatchEvent[];
  kickoffTime: string;
  upcomingEvents?: UpcomingEvent[];
  matchHistory?: MatchRecord[];
  members?: Member[];
};

type FixtureFilter = "all" | "upcoming" | "completed" | "slots";

type StandingsRow = {
  team: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  gf: number;
  ga: number;
  gd: number;
  points: number;
  form: string[];
};

const WALLPAPER_SLIDES = [
  "https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?auto=format&fit=crop&w=1800&q=80",
  "https://images.unsplash.com/photo-1551958219-acbc608c6377?auto=format&fit=crop&w=1800&q=80",
  "https://images.unsplash.com/photo-1517466787929-bc90951d0974?auto=format&fit=crop&w=1800&q=80",
  "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=1800&q=80",
];

const FOOTBALL_VIDEO_SHOWCASE = [
  {
    title: "Crowd & Match Moments",
    src: "https://cdn.coverr.co/videos/coverr-football-player-scoring-a-goal-1579/1080p.mp4",
  },
  {
    title: "Training Session Highlights",
    src: "https://cdn.coverr.co/videos/coverr-soccer-practice-1577/1080p.mp4",
  },
  {
    title: "Stadium Matchday Energy",
    src: "https://cdn.coverr.co/videos/coverr-young-football-players-training-4824/1080p.mp4",
  },
];

const fetcher = async (url: string): Promise<MatchData> => {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error("Could not load match");
  return response.json();
};

function formatDate(dateLike: string | Date, withTime = true) {
  const date = new Date(dateLike);
  if (Number.isNaN(date.getTime())) return "Date TBA";
  return date.toLocaleString("en-BD", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  });
}

function EventIcon({ type }: { type: string }) {
  if (type === "goal") return <Target className="text-emerald-400" size={16} />;
  if (type === "assist") return <Zap className="text-cyan-300" size={16} />;
  if (type === "yellow") return <Zap className="text-yellow-400" size={16} />;
  if (type === "red") return <ShieldAlert className="text-rose-400" size={16} />;
  return <AlertCircle className="text-amber-400" size={16} />;
}

function getEventPresentation(type: "goal" | "assist" | "foul" | "yellow" | "red") {
  if (type === "goal") {
    return {
      label: "Goal",
      border: "border-emerald-500/30",
      chip: "bg-emerald-500/15 text-emerald-200",
      accent: "bg-emerald-400",
    };
  }

  if (type === "assist") {
    return {
      label: "Assist",
      border: "border-cyan-500/30",
      chip: "bg-cyan-500/15 text-cyan-200",
      accent: "bg-cyan-400",
    };
  }

  if (type === "yellow") {
    return {
      label: "Yellow Card",
      border: "border-yellow-500/30",
      chip: "bg-yellow-500/15 text-yellow-200",
      accent: "bg-yellow-400",
    };
  }

  if (type === "red") {
    return {
      label: "Red Card",
      border: "border-rose-500/30",
      chip: "bg-rose-500/15 text-rose-200",
      accent: "bg-rose-400",
    };
  }

  return {
    label: "Foul",
    border: "border-amber-500/30",
    chip: "bg-amber-500/15 text-amber-200",
    accent: "bg-amber-400",
  };
}

function CountdownDisplay({ targetDate }: { targetDate: Date }) {
  const [timeLeft, setTimeLeft] = useState<{ d: number; h: number; m: number; s: number }>({ d: 0, h: 0, m: 0, s: 0 });

  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      const distance = targetDate.getTime() - now;

      if (distance <= 0) {
        setTimeLeft({ d: 0, h: 0, m: 0, s: 0 });
        clearInterval(timer);
        return;
      }

      setTimeLeft({
        d: Math.floor(distance / (1000 * 60 * 60 * 24)),
        h: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        m: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
        s: Math.floor((distance % (1000 * 60)) / 1000),
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [targetDate]);

  const units = [
    { label: "Days", value: timeLeft.d },
    { label: "Hours", value: timeLeft.h },
    { label: "Min", value: timeLeft.m },
    { label: "Sec", value: timeLeft.s },
  ];

  return (
    <div className="grid grid-cols-4 gap-2 sm:gap-3">
      {units.map((unit) => (
        <div key={unit.label} className="premium-surface rounded-2xl p-3 text-center">
          <p className="text-2xl font-black text-white tabular-nums sm:text-3xl">{String(unit.value).padStart(2, "0")}</p>
          <p className="mt-1 text-[9px] font-bold uppercase tracking-[0.16em] text-white/55">{unit.label}</p>
        </div>
      ))}
    </div>
  );
}

function buildStandings(records: MatchRecord[]): StandingsRow[] {
  const table = new Map<string, StandingsRow>();

  const ensure = (team: string) => {
    if (!table.has(team)) {
      table.set(team, {
        team,
        played: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        gf: 0,
        ga: 0,
        gd: 0,
        points: 0,
        form: [],
      });
    }
    return table.get(team)!;
  };

  records.forEach((record) => {
    if (!Array.isArray(record.teams) || record.teams.length < 2) return;
    const [a, b] = record.teams;
    if (!a || !b) return;

    const rowA = ensure(a.name || "Team A");
    const rowB = ensure(b.name || "Team B");

    rowA.played += 1;
    rowB.played += 1;

    rowA.gf += Number(a.score || 0);
    rowA.ga += Number(b.score || 0);
    rowB.gf += Number(b.score || 0);
    rowB.ga += Number(a.score || 0);

    if (a.score > b.score) {
      rowA.wins += 1;
      rowA.points += 3;
      rowB.losses += 1;
      rowA.form.unshift("W");
      rowB.form.unshift("L");
    } else if (a.score < b.score) {
      rowB.wins += 1;
      rowB.points += 3;
      rowA.losses += 1;
      rowA.form.unshift("L");
      rowB.form.unshift("W");
    } else {
      rowA.draws += 1;
      rowB.draws += 1;
      rowA.points += 1;
      rowB.points += 1;
      rowA.form.unshift("D");
      rowB.form.unshift("D");
    }

    rowA.gd = rowA.gf - rowA.ga;
    rowB.gd = rowB.gf - rowB.ga;

    rowA.form = rowA.form.slice(0, 5);
    rowB.form = rowB.form.slice(0, 5);
  });

  return Array.from(table.values()).sort((x, y) => y.points - x.points || y.gd - x.gd || y.gf - x.gf || x.team.localeCompare(y.team));
}

export default function LiveMatchBoard() {
  const { data, error } = useSWR("/api/match", fetcher, {
    refreshInterval: 2500,
  });

  const [showRecordDetails, setShowRecordDetails] = useState(false);
  const [fixtureFilter, setFixtureFilter] = useState<FixtureFilter>("all");
  const [activeWallpaper, setActiveWallpaper] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveWallpaper((prev) => (prev + 1) % WALLPAPER_SLIDES.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  if (error) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <AlertCircle className="mx-auto mb-4 text-rose-500" size={48} />
          <h2 className="text-2xl font-bold text-white">Connection Error</h2>
          <p className="text-white/60">Could not sync with live match atmosphere.</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <motion.div animate={{ scale: [1, 1.08, 1], opacity: [0.5, 1, 0.5] }} transition={{ repeat: Infinity, duration: 2 }} className="text-center">
          <Trophy className="mx-auto mb-4 text-cyan-400" size={48} />
          <p className="section-title text-xs font-bold text-cyan-300">Loading Your Matchday Experience</p>
        </motion.div>
      </div>
    );
  }

  const [teamA, teamB] = data.teams || [];

  if (!teamA || !teamB) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <AlertCircle className="mx-auto mb-4 text-amber-400" size={40} />
        <h2 className="text-2xl font-black text-white">Teams are not configured yet</h2>
        <p className="mt-2 text-sm text-white/60">Set up lineups in admin to unlock live fixtures and standings.</p>
      </div>
    );
  }

  const safeNumber = (value: unknown) => {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  };

  const progress = Math.min((data.elapsedMinutes / Math.max(1, data.slotMinutes)) * 100, 100);
  const playerPool = data.teams.flatMap((team) =>
    team.players.map((player) => ({
      ...player,
      teamKey: team.key,
    })),
  );

  const getLeaders = (valueSelector: (player: (typeof playerPool)[number]) => number) => {
    const highest = Math.max(0, ...playerPool.map((player) => safeNumber(valueSelector(player))));
    if (highest <= 0) {
      return { names: "No leader yet", value: 0 };
    }

    const names = playerPool
      .filter((player) => safeNumber(valueSelector(player)) === highest)
      .map((player) => `${player.name} (${player.teamKey})`)
      .join(", ");

    return { names, value: highest };
  };

  const topScorer = getLeaders((player) => player.goals);
  const topAssist = getLeaders((player) => player.assists);
  const topFouls = getLeaders((player) => player.fouls);
  const topYellow = getLeaders((player) => player.yellowCards);

  const timelineFeed = [...(data.events || [])]
    .sort((a, b) => {
      if (a.minute !== b.minute) return b.minute - a.minute;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  const isLiveContext = Boolean(data.isLiveContext);
  const isHistoryContext = !isLiveContext && String(data.currentMatchId || "live") !== "live";

  const specialEvent = data.specialEvent;
  const showSpecialEvent = Boolean(specialEvent?.enabled);
  const specialEventDate = specialEvent?.eventDate ? new Date(specialEvent.eventDate) : null;
  const hasSpecialDate = Boolean(specialEventDate && !Number.isNaN(specialEventDate.getTime()));
  const specialDateText = hasSpecialDate ? formatDate(specialEventDate!, true) : "Date TBA";
  const lineupPlayers = (Array.isArray(specialEvent?.formationPlayers) ? specialEvent.formationPlayers : [])
    .filter((player) => String(player.name || "").trim().length > 0)
    .sort((a, b) => {
      if (a.y !== b.y) return a.y - b.y;
      return a.x - b.x;
    });
  const starterNameSet = new Set(lineupPlayers.map((player) => String(player.name).trim().toLowerCase()));
  const substitutes = showSpecialEvent
    ? Array.from(
        new Set(
          [
            ...(specialEvent?.squad?.gk || []),
            ...(specialEvent?.squad?.cb || []),
            ...(specialEvent?.squad?.cmf || []),
            ...(specialEvent?.squad?.cf || []),
          ]
            .map((name) => String(name || "").trim())
            .filter((name) => name.length > 0 && !starterNameSet.has(name.toLowerCase())),
        ),
      )
    : [];

  const kickoffDate = showSpecialEvent && hasSpecialDate ? specialEventDate : data.kickoffTime ? new Date(data.kickoffTime) : null;
  const isPreMatch = data.elapsedMinutes === 0 && kickoffDate && Date.now() < kickoffDate.getTime();

  const showExpandedMatchSections = !isHistoryContext || showRecordDetails;

  const upcomingEvents = [...(data.upcomingEvents || [])].sort(
    (a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime(),
  );

  const historyMatches = [...(data.matchHistory || [])].sort(
    (a, b) => new Date(b.kickoffTime).getTime() - new Date(a.kickoffTime).getTime(),
  );

  const nextUpcoming = upcomingEvents.find((event) => new Date(event.eventDate).getTime() >= Date.now()) || upcomingEvents[0];

  const standings = buildStandings(historyMatches);

  const shouldShow = (key: Exclude<FixtureFilter, "all">) => fixtureFilter === "all" || fixtureFilter === key;

  return (
    <main className="relative mx-auto flex w-full max-w-7xl flex-1 flex-col gap-8 px-4 py-6 md:py-10">
      <section className="relative overflow-hidden rounded-[2rem] border border-white/10 shadow-[0_24px_80px_rgba(0,0,0,0.55)]">
        <div className="relative h-[240px] sm:h-[300px] md:h-[360px]">
          {WALLPAPER_SLIDES.map((slide, index) => (
            <img
              key={slide}
              src={slide}
              alt={`Football wallpaper ${index + 1}`}
              className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ${
                index === activeWallpaper ? "opacity-100" : "opacity-0"
              }`}
            />
          ))}
          <div className="absolute inset-0 bg-gradient-to-t from-[#030711] via-[#030711]/40 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-4 md:p-6">
            <p className="section-title text-[10px] font-bold text-cyan-200/90">Matchday Moments</p>
            <p className="mt-1 text-2xl font-black text-white md:text-3xl">Relive Football Atmosphere</p>
            <div className="mt-3 flex gap-2">
              {WALLPAPER_SLIDES.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setActiveWallpaper(index)}
                  className={`h-2.5 w-7 rounded-full transition ${
                    activeWallpaper === index ? "bg-cyan-300" : "bg-white/35 hover:bg-white/60"
                  }`}
                  aria-label={`Show wallpaper ${index + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="premium-surface rounded-[2rem] p-5 md:p-7">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <span className={isLiveContext ? "live-indicator" : "h-2 w-2 rounded-full bg-cyan-300"} />
              <span className="section-title text-[10px] font-bold text-cyan-200/90">
                {isLiveContext ? "Live Match Updates" : "Matchday Hub"}
              </span>
            </div>
            <h1 className="text-4xl font-black leading-tight text-white sm:text-5xl lg:text-6xl">{data.title}</h1>
            <p className="mt-2 text-sm text-white/65">
              See your next match, recent results, standings, and live action in one place.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:flex">
            <div className="premium-chip rounded-2xl px-4 py-3 text-center">
              <p className="section-title text-[9px] font-bold text-white/55">Status</p>
              <p className="mt-1 text-sm font-black text-white">{isLiveContext ? "Live" : "Scheduled"}</p>
            </div>
            <div className="premium-chip rounded-2xl px-4 py-3 text-center">
              <p className="section-title text-[9px] font-bold text-white/55">Session</p>
              <p className="mt-1 text-sm font-black text-white">{data.elapsedMinutes}/{data.slotMinutes}m</p>
            </div>
            <div className="premium-chip col-span-2 rounded-2xl px-4 py-3 text-center sm:col-span-1">
              <p className="section-title text-[9px] font-bold text-white/55">Updated</p>
              <p className="mt-1 text-sm font-black text-white">{formatDate(new Date(), true)}</p>
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {[
            { key: "all", label: "All Sections" },
            { key: "upcoming", label: "Upcoming" },
            { key: "completed", label: "Results" },
            { key: "slots", label: "Slots" },
          ].map((item) => (
            <button
              key={item.key}
              onClick={() => setFixtureFilter(item.key as FixtureFilter)}
              className={`rounded-full px-4 py-2 text-[11px] font-bold uppercase tracking-[0.14em] transition ${
                fixtureFilter === item.key
                  ? "bg-cyan-300 text-slate-950 shadow-[0_0_18px_rgba(34,211,238,0.45)]"
                  : "border border-white/12 bg-white/5 text-white/70 hover:bg-white/10"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </section>

      {showSpecialEvent && specialEvent ? (
        <section className="premium-surface overflow-hidden rounded-[2rem] p-5 md:p-7">
          <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-cyan-300/35 bg-cyan-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-cyan-200">
                <Shield size={13} />
                {specialEvent.badgeText || "Featured Match"}
              </span>
              <h2 className="mt-4 text-4xl font-black leading-none text-white md:text-5xl">{specialEvent.title}</h2>
              <p className="mt-3 text-base text-white/70 md:text-lg">{specialEvent.subtitle}</p>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="premium-chip rounded-2xl px-4 py-3">
                  <p className="section-title text-[9px] font-bold text-white/50">Date</p>
                  <p className="mt-1 text-sm font-black text-white">{specialDateText}</p>
                </div>
                <div className="premium-chip rounded-2xl px-4 py-3">
                  <p className="section-title text-[9px] font-bold text-white/50">Venue</p>
                  <p className="mt-1 text-sm font-black text-white">{specialEvent.venue}</p>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-black/25 p-3">
              <p className="section-title mb-3 text-[10px] font-bold text-white/55">Special Formation</p>
              <SpecialMatchFormationPitch
                players={Array.isArray(specialEvent.formationPlayers) ? specialEvent.formationPlayers : []}
                className="min-h-[290px]"
              />
            </div>
          </div>
        </section>
      ) : null}

      {showSpecialEvent && specialEvent && shouldShow("upcoming") ? (
        <section className="relative overflow-hidden rounded-[2rem] border border-indigo-300/25 bg-gradient-to-b from-indigo-900/85 via-indigo-900/75 to-indigo-950/95 p-5 shadow-[0_24px_70px_rgba(20,18,70,0.55)] md:p-7">
          <div className="pointer-events-none absolute inset-0 opacity-25 [background-image:radial-gradient(rgba(255,255,255,0.35)_1px,transparent_1px)] [background-size:22px_22px]" />

          <div className="relative z-10">
            <p className="text-4xl font-black leading-none text-white sm:text-5xl md:text-6xl">Starting Lineup</p>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-indigo-100/85">
              <span>{specialEvent.homeTeamName || teamA.name}</span>
              <span className="rounded-full border border-white/25 px-2 py-0.5 text-[10px] text-white">VS</span>
              <span>{specialEvent.awayTeamName || teamB.name}</span>
              <span className="ml-auto rounded-full border border-white/20 bg-white/10 px-2.5 py-1 text-[9px] font-bold text-white/80">
                Updated by Admin
              </span>
            </div>

            {lineupPlayers.length === 0 ? (
              <div className="mt-5 rounded-2xl border border-dashed border-white/25 bg-black/20 p-6 text-center text-sm font-bold text-white/75">
                No lineup players configured yet. Add players in Admin → Special Event Banner Control.
              </div>
            ) : (
              <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                {lineupPlayers.map((player) => (
                  <article
                    key={player.id}
                    className="overflow-hidden rounded-xl border border-white/15 bg-[#0f1a5a]/80 shadow-[0_8px_20px_rgba(0,0,0,0.35)]"
                  >
                    <div className="h-32 bg-black/30 sm:h-36">
                      {player.imageUrl ? (
                        <img src={player.imageUrl} alt={player.name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-3xl font-black text-white/70">
                          {player.name.slice(0, 1).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="border-t border-white/10 px-2 py-2">
                      <p className="truncate text-sm font-black text-white">{player.name}</p>
                      <p className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-cyan-200/85">
                        {player.role}
                      </p>
                    </div>
                  </article>
                ))}
              </div>
            )}

            {substitutes.length > 0 ? (
              <div className="mt-4 rounded-2xl border border-white/15 bg-black/25 px-4 py-3">
                <p className="text-4xl font-black uppercase italic leading-none text-white/95 sm:text-5xl">Subs</p>
                <p className="mt-2 text-sm font-semibold text-indigo-50/90">{substitutes.join(", ")}</p>
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      <section className="premium-surface rounded-[2rem] p-5 md:p-7">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-2xl font-black text-white">
            <Activity className="text-cyan-300" size={20} />
            Watch Football Highlights
          </h2>
          <span className="section-title text-[10px] font-bold text-white/45">For Fans</span>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {FOOTBALL_VIDEO_SHOWCASE.map((video) => (
            <article key={video.src} className="overflow-hidden rounded-2xl border border-white/10 bg-black/30">
              <div className="aspect-video bg-black">
                <video
                  src={video.src}
                  className="h-full w-full object-cover"
                  muted
                  loop
                  playsInline
                  autoPlay
                  controls
                  preload="metadata"
                />
              </div>
              <div className="px-3 py-2.5">
                <p className="text-sm font-black text-white">{video.title}</p>
                <p className="mt-1 text-[11px] text-white/55">Live online football motion background content</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      {shouldShow("upcoming") ? (
        <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="premium-surface rounded-[2rem] p-5 md:p-7">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-2xl font-black text-white">
                <Calendar className="text-cyan-300" size={20} />
                Next Match Highlight
              </h2>
              <span className="premium-chip rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em]">Next Up</span>
            </div>

            {nextUpcoming ? (
              <>
                <div className="rounded-3xl border border-cyan-400/25 bg-gradient-to-r from-cyan-500/12 to-emerald-500/10 p-4 md:p-5">
                  <p className="section-title text-[10px] font-bold text-cyan-200/85">{nextUpcoming.title}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-3 text-white/80">
                    <span className="inline-flex items-center gap-2 rounded-full border border-white/15 px-3 py-1 text-xs font-bold">
                      <Clock3 size={14} className="text-cyan-300" />
                      {formatDate(nextUpcoming.eventDate, true)}
                    </span>
                    <span className="inline-flex items-center gap-2 rounded-full border border-white/15 px-3 py-1 text-xs font-bold">
                      <Timer size={14} className="text-emerald-300" />
                      {nextUpcoming.slotMinutes} min slot
                    </span>
                  </div>
                  {nextUpcoming.notes ? <p className="mt-3 text-sm text-white/65">{nextUpcoming.notes}</p> : null}
                </div>

                {new Date(nextUpcoming.eventDate).getTime() > Date.now() ? (
                  <div className="mt-4">
                    <p className="section-title mb-2 text-[10px] font-bold text-white/45">Countdown To Kickoff</p>
                    <CountdownDisplay targetDate={new Date(nextUpcoming.eventDate)} />
                  </div>
                ) : null}
              </>
            ) : (
              <div className="rounded-2xl border border-dashed border-white/15 bg-black/25 p-7 text-center">
                <CircleSlash className="mx-auto mb-3 text-white/35" size={30} />
                <p className="text-sm font-bold text-white/65">No upcoming fixture is scheduled yet.</p>
              </div>
            )}
          </div>

          <div className="premium-surface rounded-[2rem] p-5 md:p-7">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-xl font-black text-white">Upcoming Matches</h3>
              <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/45">{upcomingEvents.length} listed</span>
            </div>

            <div className="space-y-3">
              {upcomingEvents.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/15 bg-black/20 p-5 text-center text-xs font-bold uppercase tracking-[0.12em] text-white/45">
                  No upcoming slots yet
                </div>
              ) : (
                upcomingEvents.slice(0, 4).map((event) => (
                  <div key={event.id} className="rounded-2xl border border-white/10 bg-black/25 p-4 transition hover:border-cyan-300/35 hover:bg-black/35">
                    <p className="text-sm font-black text-white">{event.title}</p>
                    <p className="mt-1 text-xs text-white/60">{formatDate(event.eventDate, true)}</p>
                    <div className="mt-2 flex items-center justify-between text-xs">
                      <span className="inline-flex items-center gap-1 text-cyan-200">
                        <Timer size={13} /> {event.slotMinutes}m
                      </span>
                      <span className="inline-flex items-center gap-1 text-emerald-200">
                        <Users size={13} /> {event.participants?.filter((p) => p.confirmed).length || 0} confirmed
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      ) : null}

      {shouldShow("completed") ? (
        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="premium-surface rounded-[2rem] p-5 md:p-7">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-2xl font-black text-white">
                <History className="text-cyan-300" size={20} />
                Previous Match Results
              </h2>
              <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/45">Recent archive</span>
            </div>

            <div className="space-y-3">
              {historyMatches.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/15 bg-black/20 p-6 text-center text-sm font-bold text-white/55">
                  No completed results in history yet.
                </div>
              ) : (
                historyMatches.slice(0, 6).map((record) => {
                  const left = record.teams?.[0];
                  const right = record.teams?.[1];
                  return (
                    <div key={record.id} className="rounded-2xl border border-white/10 bg-black/25 p-4 transition hover:border-emerald-300/30 hover:bg-black/35">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-black text-white">{record.title}</p>
                        <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/45">{formatDate(record.kickoffTime, false)}</span>
                      </div>
                      <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                        <p className="truncate text-right text-sm font-bold text-white/85">{left?.name || "Team A"}</p>
                        <p className="rounded-xl border border-white/10 bg-black/45 px-3 py-1 text-base font-black text-white tabular-nums">
                          {left?.score ?? 0} - {right?.score ?? 0}
                        </p>
                        <p className="truncate text-sm font-bold text-white/85">{right?.name || "Team B"}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
          <div className="premium-surface rounded-[2rem] p-5 md:p-7">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-2xl font-black text-white">Standings</h2>
              <span className="section-title text-[10px] font-bold text-white/45">Points table</span>
            </div>

            {standings.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/15 bg-black/20 p-6 text-center text-sm font-bold text-white/55">
                Standings will appear after completed matches.
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/20">
                <div className="grid grid-cols-[40px_1fr_36px_36px_36px_36px] gap-2 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.12em] text-white/45">
                  <span>#</span>
                  <span>Team</span>
                  <span>P</span>
                  <span>W</span>
                  <span>GD</span>
                  <span>Pts</span>
                </div>
                {standings.map((row, index) => (
                  <div key={row.team} className="fixture-table-row grid grid-cols-[40px_1fr_36px_36px_36px_36px] gap-2 px-3 py-2.5 text-sm">
                    <span className="font-black text-cyan-200">{index + 1}</span>
                    <div className="min-w-0">
                      <p className="truncate font-black text-white">{row.team}</p>
                      <p className="text-[10px] font-bold text-white/45">
                        {row.form.length > 0 ? row.form.join(" ") : "No form yet"}
                      </p>
                    </div>
                    <span className="font-bold text-white/80">{row.played}</span>
                    <span className="font-bold text-white/80">{row.wins}</span>
                    <span className="font-bold text-white/80">{row.gd > 0 ? `+${row.gd}` : row.gd}</span>
                    <span className="font-black text-emerald-300">{row.points}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      ) : null}

      {shouldShow("slots") ? (
        <section className="premium-surface rounded-[2rem] p-5 md:p-7">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-2xl font-black text-white">
              <LayoutGrid className="text-cyan-300" size={20} />
              Available Match Slots
            </h2>
            <span className="section-title text-[10px] font-bold text-white/45">Scan-ready cards</span>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {upcomingEvents.length === 0 ? (
              <div className="col-span-full rounded-2xl border border-dashed border-white/15 bg-black/20 p-7 text-center">
                <p className="text-sm font-bold text-white/55">No slot cards available yet.</p>
              </div>
            ) : (
              upcomingEvents.map((event) => {
                const totalMembers = data.members?.length || event.participants?.length || 0;
                const confirmed = event.participants?.filter((p) => p.confirmed).length || 0;
                const paid = event.participants?.reduce((sum, p) => sum + Number(p.paidAmount || 0), 0) || 0;
                const isFuture = new Date(event.eventDate).getTime() > Date.now();

                return (
                  <article key={event.id} className="group rounded-3xl border border-white/10 bg-black/30 p-4 transition hover:-translate-y-1 hover:border-cyan-300/35 hover:bg-black/40">
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <h3 className="text-base font-black text-white">{event.title}</h3>
                      <span
                        className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] ${
                          isFuture ? "bg-emerald-500/15 text-emerald-200" : "bg-amber-500/15 text-amber-200"
                        }`}
                      >
                        {isFuture ? "Available" : "Completed"}
                      </span>
                    </div>

                    <div className="space-y-2 text-xs text-white/75">
                      <p className="inline-flex items-center gap-2"><Calendar size={13} className="text-cyan-300" /> {formatDate(event.eventDate, true)}</p>
                      <p className="inline-flex items-center gap-2"><Timer size={13} className="text-emerald-300" /> {event.slotMinutes} minutes</p>
                      <p className="inline-flex items-center gap-2"><Users size={13} className="text-cyan-200" /> {confirmed}/{totalMembers} confirmed</p>
                      <p className="inline-flex items-center gap-2"><CircleCheck size={13} className="text-amber-300" /> Paid: {Math.round(paid * 100) / 100} / {event.totalSlotFee || 0}</p>
                    </div>

                    {event.notes ? <p className="mt-3 border-t border-white/10 pt-3 text-xs text-white/60">{event.notes}</p> : null}
                  </article>
                );
              })
            )}
          </div>
        </section>
      ) : null}

      <section className="premium-surface rounded-[2rem] p-5 md:p-7">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-2xl font-black text-white">
            <Shield className="text-cyan-300" size={20} />
            Team Cards
          </h2>
          <span className="section-title text-[10px] font-bold text-white/45">Participants snapshot</span>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {[teamA, teamB].map((team, index) => {
            const starters = team.players.filter((p) => p.isStarter).length;
            const scorers = team.players.filter((p) => p.goals > 0).sort((a, b) => b.goals - a.goals).slice(0, 2);
            return (
              <article key={team.key} className="rounded-3xl border border-white/10 bg-black/30 p-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-black text-white">{team.name}</h3>
                  <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] ${index === 0 ? "bg-cyan-500/15 text-cyan-200" : "bg-emerald-500/15 text-emerald-200"}`}>
                    Team {team.key}
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                  <div className="premium-chip rounded-xl p-2">
                    <p className="text-lg font-black text-white">{team.score}</p>
                    <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-white/55">Score</p>
                  </div>
                  <div className="premium-chip rounded-xl p-2">
                    <p className="text-lg font-black text-white">{starters}/{data.playersPerSide}</p>
                    <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-white/55">Starters</p>
                  </div>
                  <div className="premium-chip rounded-xl p-2">
                    <p className="text-lg font-black text-white">{team.players.length}</p>
                    <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-white/55">Squad</p>
                  </div>
                </div>

                <div className="mt-4">
                  <p className="section-title text-[10px] font-bold text-white/45">Top Scorers</p>
                  {scorers.length === 0 ? (
                    <p className="mt-2 text-sm text-white/60">No goals recorded yet.</p>
                  ) : (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {scorers.map((player) => (
                        <span key={player.name} className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-bold text-white/80">
                          <Flag size={12} className="text-cyan-300" />
                          {player.name} ({player.goals})
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <AnimatePresence mode="wait">
        {isPreMatch && kickoffDate ? (
          <motion.section
            key="pre-match"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="premium-surface rounded-[2rem] p-6 text-center md:p-8"
          >
            <p className="section-title text-[10px] font-bold text-cyan-200/80">Kickoff Countdown</p>
            <h2 className="mt-2 text-3xl font-black text-white md:text-4xl">
              {showSpecialEvent && specialEvent?.subtitle ? specialEvent.subtitle : data.title}
            </h2>
            <p className="mt-2 text-sm text-white/60">Match starts at {formatDate(kickoffDate, true)}</p>
            <div className="mx-auto mt-5 max-w-xl">
              <CountdownDisplay targetDate={kickoffDate} />
            </div>
          </motion.section>
        ) : (
          <motion.section
            key="live-match"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid gap-6"
          >
            <div className="premium-surface rounded-[2rem] p-5 md:p-7">
              <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div>
                  <div className="mb-2 flex items-center gap-2">
                    <span className={isLiveContext ? "live-indicator" : "h-2 w-2 rounded-full bg-amber-300"} />
                    <span className={`section-title text-[10px] font-bold ${isLiveContext ? "text-emerald-300" : "text-amber-200"}`}>
                      {isLiveContext ? "Live Now" : "Match Summary"}
                    </span>
                  </div>
                  <h2 className="text-4xl font-black text-white md:text-5xl">Live Match Data</h2>
                </div>

                <div className="glass-pane-brighter flex items-center gap-5 rounded-2xl px-5 py-3">
                  <div>
                    <p className="section-title text-[9px] font-bold text-white/45">Elapsed</p>
                    <p className="text-2xl font-black text-cyan-300">{data.elapsedMinutes}m</p>
                  </div>
                  <div className="h-10 w-px bg-white/15" />
                  <div>
                    <p className="section-title text-[9px] font-bold text-white/45">Slot</p>
                    <p className="text-2xl font-black text-white">{data.slotMinutes}m</p>
                  </div>
                </div>
              </header>

              <div className="mt-5 h-2 w-full overflow-hidden rounded-full bg-white/10">
                <motion.div initial={{ width: 0 }} animate={{ width: `${progress}%` }} className="h-full bg-gradient-to-r from-cyan-400 via-emerald-400 to-amber-300" />
              </div>
            </div>
            {(isHistoryContext || (showSpecialEvent && !isLiveContext)) && (
              <section className="glass-pane overflow-hidden rounded-[2rem] border border-amber-400/20 shadow-xl">
                <div className="flex flex-col md:flex-row md:items-center">
                  <div className="flex flex-1 items-center gap-4 p-5">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-400 shadow-inner">
                      <History size={22} />
                    </div>
                    <div className="flex-1">
                      <p className="section-title text-[10px] font-bold text-amber-200/75">Record Spotlight</p>
                      <h3 className="text-lg font-black text-white">{data.title}</h3>
                    </div>
                  </div>

                  <button
                    onClick={() => setShowRecordDetails((prev) => !prev)}
                    className="bg-white/5 px-6 py-4 text-xs font-black uppercase tracking-[0.14em] text-white transition hover:bg-emerald-400 hover:text-slate-950"
                  >
                    {showRecordDetails ? "Hide Deep View" : "Open Deep View"}
                  </button>
                </div>
              </section>
            )}

            {showExpandedMatchSections ? (
              <>
                <section className="grid gap-5 lg:grid-cols-[1fr_auto_1fr]">
                  <motion.div whileHover={{ y: -4 }} className="glass-pane group relative overflow-hidden rounded-[2rem] p-5 text-center md:p-7">
                    <div className="mb-4">
                      <h3 className="text-3xl font-black text-white">{teamA.name}</h3>
                    </div>
                    <div className="glow-a">
                      <AnimatePresence mode="wait">
                        <motion.span
                          key={teamA.score}
                          initial={{ y: 16, opacity: 0 }}
                          animate={{ y: 0, opacity: 1 }}
                          exit={{ y: -14, opacity: 0 }}
                          className="block text-8xl font-black leading-none text-cyan-300 md:text-9xl"
                        >
                          {teamA.score}
                        </motion.span>
                      </AnimatePresence>
                    </div>
                    <div className="mt-6 grid grid-cols-3 gap-2">
                      <MatchStatCard icon={AlertCircle} label="Fouls" value={teamA.teamFouls} color="amber" className="p-2.5" />
                      <MatchStatCard icon={Zap} label="YC" value={teamA.yellowCards} color="sky" className="p-2.5" />
                      <MatchStatCard icon={ShieldAlert} label="RC" value={teamA.redCards} color="rose" className="p-2.5" />
                    </div>
                  </motion.div>

                  <div className="flex items-center justify-center">
                    <div className="glass-pane-brighter flex h-16 w-16 items-center justify-center rounded-2xl border border-cyan-300/30">
                      <span className="text-2xl font-black text-white/35">VS</span>
                    </div>
                  </div>

                  <motion.div whileHover={{ y: -4 }} className="glass-pane group relative overflow-hidden rounded-[2rem] p-5 text-center md:p-7">
                    <div className="mb-4">
                      <h3 className="text-3xl font-black text-white">{teamB.name}</h3>
                    </div>
                    <div className="glow-b">
                      <AnimatePresence mode="wait">
                        <motion.span
                          key={teamB.score}
                          initial={{ y: 16, opacity: 0 }}
                          animate={{ y: 0, opacity: 1 }}
                          exit={{ y: -14, opacity: 0 }}
                          className="block text-8xl font-black leading-none text-emerald-300 md:text-9xl"
                        >
                          {teamB.score}
                        </motion.span>
                      </AnimatePresence>
                    </div>
                    <div className="mt-6 grid grid-cols-3 gap-2">
                      <MatchStatCard icon={AlertCircle} label="Fouls" value={teamB.teamFouls} color="amber" className="p-2.5" />
                      <MatchStatCard icon={Zap} label="YC" value={teamB.yellowCards} color="sky" className="p-2.5" />
                      <MatchStatCard icon={ShieldAlert} label="RC" value={teamB.redCards} color="rose" className="p-2.5" />
                    </div>
                  </motion.div>
                </section>

                <section className="glass-pane rounded-[2rem] p-5 md:p-7">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <h3 className="flex items-center gap-2 text-2xl font-black text-white">
                      <Trophy className="text-cyan-300" size={20} />
                      Match Leaders
                    </h3>
                    <span className="premium-chip rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em]">Top Performers</span>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4">
                      <p className="section-title text-[9px] font-bold text-emerald-200">Top Scorer</p>
                      <p className="mt-2 text-base font-black text-white">{topScorer.names}</p>
                      <p className="mt-1 text-xs font-bold text-emerald-300">Goals: {topScorer.value}</p>
                    </div>
                    <div className="rounded-2xl border border-cyan-500/30 bg-cyan-500/10 p-4">
                      <p className="section-title text-[9px] font-bold text-cyan-200">Top Assist</p>
                      <p className="mt-2 text-base font-black text-white">{topAssist.names}</p>
                      <p className="mt-1 text-xs font-bold text-cyan-200">Assists: {topAssist.value}</p>
                    </div>
                    <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
                      <p className="section-title text-[9px] font-bold text-amber-200">Most Fouls</p>
                      <p className="mt-2 text-base font-black text-white">{topFouls.names}</p>
                      <p className="mt-1 text-xs font-bold text-amber-200">Fouls: {topFouls.value}</p>
                    </div>
                    <div className="rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-4">
                      <p className="section-title text-[9px] font-bold text-yellow-200">Most Yellow Cards</p>
                      <p className="mt-2 text-base font-black text-white">{topYellow.names}</p>
                      <p className="mt-1 text-xs font-bold text-yellow-200">Yellow: {topYellow.value}</p>
                    </div>
                  </div>
                </section>

                <section className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
                  <div className="glass-pane rounded-[2rem] p-5 md:p-7">
                    <div className="mb-4 flex items-center justify-between">
                      <h3 className="flex items-center gap-2 text-2xl font-black text-white">
                        <Activity className="text-cyan-300" size={20} />
                        Tactical Lineups
                      </h3>
                      <span className="rounded-full border border-white/15 bg-black/35 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white/60">
                        {data.playersPerSide}v{data.playersPerSide}
                      </span>
                    </div>
                    <TacticalCanvas teamA={teamA} teamB={teamB} playersPerSide={data.playersPerSide} variant="premium" />
                  </div>

                  <div className="glass-pane flex flex-col rounded-[2rem] p-5 md:p-7">
                    <div className="mb-4 flex items-center justify-between">
                      <h3 className="flex items-center gap-2 text-2xl font-black text-white">
                        <History className="text-cyan-300" size={20} />
                        Match Timeline
                      </h3>
                      <span className="rounded-full border border-white/15 bg-black/35 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white/55">
                        Latest first
                      </span>
                    </div>

                    <div className="max-h-[500px] flex-1 space-y-3 overflow-y-auto pr-1">
                      {timelineFeed.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center text-white/30">
                          <TrendingUp size={30} className="mb-2 opacity-20" />
                          <p className="text-sm">Ball is rolling. Waiting for events...</p>
                        </div>
                      ) : (
                        timelineFeed.map((event, index) => {
                          const meta = getEventPresentation(event.type);
                          const isTeamA = event.teamKey === "A";

                          return (
                            <motion.div
                              key={`${event.createdAt}-${index}`}
                              initial={{ opacity: 0, x: 12 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: index * 0.03 }}
                              className={`overflow-hidden rounded-2xl border bg-black/35 p-3 ${meta.border}`}
                            >
                              <div className="mb-2 flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-black/40">
                                    <EventIcon type={event.type} />
                                  </div>
                                  <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] ${meta.chip}`}>
                                    {meta.label}
                                  </span>
                                </div>
                                <span className="rounded-full border border-white/15 bg-black/45 px-2.5 py-1 text-sm font-black text-white">
                                  {event.minute}&apos;
                                </span>
                              </div>

                              <div className="flex items-center justify-between gap-3">
                                <div>
                                  <p className="text-sm font-black text-white">{event.playerName}</p>
                                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/45">
                                    {isTeamA ? teamA.name : teamB.name}
                                  </p>
                                </div>
                                <span className={`text-xs font-black ${isTeamA ? "text-cyan-200" : "text-emerald-200"}`}>
                                  {event.teamKey}
                                </span>
                              </div>
                            </motion.div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </section>

                <section className="glass-pane rounded-[2rem] p-5 md:p-7">
                  <PhotoGallery matchId={data.currentMatchId || "live"} matchTitle={data.currentMatchTitle || data.title} />
                </section>
              </>
            ) : null}
          </motion.section>
        )}
      </AnimatePresence>

      <footer className="mt-2 rounded-2xl border border-white/10 bg-black/30 px-4 py-4 text-center text-xs text-white/50">
        <p className="inline-flex items-center gap-2">
          <ArrowRight size={12} className="text-cyan-300" />
          SMT Tournament Hub premium matchday interface
        </p>
      </footer>
    </main>
  );
}
