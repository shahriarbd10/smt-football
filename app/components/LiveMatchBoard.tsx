"use client";

import { useState, useEffect } from "react";
import useSWR from "swr";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Trophy, 
  Clock, 
  Activity, 
  AlertCircle, 
  ChevronRight,
  Zap,
  Target,
  History,
  TrendingUp,
  ShieldAlert,
  Camera
} from "lucide-react";
import { MatchStatCard } from "./shared/MatchStatCard";
import { TacticalCanvas } from "./shared/TacticalCanvas";
import PhotoGallery from "./PhotoGallery";

type Player = {
  name: string;
  isStarter: boolean;
  isGoalkeeper: boolean;
  goals: number;
  fouls: number;
  yellowCards: number;
  redCards: number;
  assists: number;
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
    type: "goal" | "assist" | "foul" | "yellow" | "red";
    createdAt: string;
  }>;
  kickoffTime: string;
};

const fetcher = async (url: string): Promise<MatchData> => {
  const response = await fetch(url);
  if (!response.ok) throw new Error("Could not load match");
  return response.json();
};

function EventIcon({ type }: { type: string }) {
  if (type === "goal") return <Target className="text-emerald-400" size={16} />;
  if (type === "assist") return <Zap className="text-indigo-400" size={16} />;
  if (type === "yellow") return <Zap className="text-yellow-400" size={16} />;
  if (type === "red") return <ShieldAlert className="text-rose-400" size={16} />;
  return <AlertCircle className="text-amber-400" size={16} />;
}

function CountdownDisplay({ targetDate }: { targetDate: Date }) {
  const [timeLeft, setTimeLeft] = useState<{ h: number; m: number; s: number }>({ h: 0, m: 0, s: 0 });

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date().getTime();
      const distance = targetDate.getTime() - now;

      if (distance < 0) {
        clearInterval(timer);
        return;
      }

      setTimeLeft({
        h: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        m: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
        s: Math.floor((distance % (1000 * 60)) / 1000),
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [targetDate]);

  return (
    <div className="flex gap-4">
      {[
        { label: "HRS", value: timeLeft.h },
        { label: "MIN", value: timeLeft.m },
        { label: "SEC", value: timeLeft.s },
      ].map((unit) => (
        <div key={unit.label} className="flex flex-col items-center">
          <div className="glass-pane-brighter flex h-16 w-16 items-center justify-center rounded-2xl text-3xl font-black text-white shadow-xl">
            {String(unit.value).padStart(2, "0")}
          </div>
          <span className="mt-2 text-[8px] font-bold tracking-[0.2em] text-white/20 uppercase">{unit.label}</span>
        </div>
      ))}
    </div>
  );
}

export default function LiveMatchBoard() {
  const { data, error } = useSWR("/api/match", fetcher, {
    refreshInterval: 2500,
  });

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
        <motion.div 
          animate={{ scale: [1, 1.1, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="text-center"
        >
          <Trophy className="mx-auto mb-4 text-emerald-500" size={48} />
          <p className="font-heading tracking-widest text-emerald-500">INITIATING LIVE FEED...</p>
        </motion.div>
      </div>
    );
  }

  const [teamA, teamB] = data.teams;
  const progress = Math.min((data.elapsedMinutes / data.slotMinutes) * 100, 100);

  // Countdown Logic
  const kickoffDate = data.kickoffTime ? new Date(data.kickoffTime) : null;
  const isPreMatch = data.elapsedMinutes === 0 && kickoffDate && new Date() < kickoffDate;

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-8 md:py-12">
      <AnimatePresence mode="wait">
        {isPreMatch && kickoffDate ? (
          <motion.div
            key="pre-match"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            className="flex min-h-[60vh] flex-col items-center justify-center text-center"
          >
            <div className="glass-pane relative overflow-hidden rounded-[3rem] p-12 md:p-20">
              <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-emerald-500/10 blur-[100px]" />
              <div className="absolute -bottom-20 -right-20 h-64 w-64 rounded-full bg-amber-500/10 blur-[100px]" />
              
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="mb-8"
              >
                <div className="mb-4 flex items-center justify-center gap-3">
                  <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] font-bold tracking-[0.5em] text-emerald-400 uppercase">Incoming Session</span>
                </div>
                <h1 className="text-6xl font-black text-white md:text-8xl tracking-tighter">
                  {data.title}
                </h1>
              </motion.div>

              <div className="mb-12 flex flex-col items-center justify-center gap-6 md:flex-row">
                <div className="flex flex-col items-center">
                   <div className="h-20 w-20 overflow-hidden rounded-2xl border border-white/10 bg-black/20 p-2">
                     <img src="/images/team_a.png" alt="" className="h-full w-full object-contain" />
                   </div>
                   <span className="mt-2 text-sm font-bold text-white/60">{teamA.name}</span>
                </div>
                <div className="text-2xl font-black text-white/20 italic">VS</div>
                <div className="flex flex-col items-center">
                   <div className="h-20 w-20 overflow-hidden rounded-2xl border border-white/10 bg-black/20 p-2">
                     <img src="/images/team_b.png" alt="" className="h-full w-full object-contain" />
                   </div>
                   <span className="mt-2 text-sm font-bold text-white/60">{teamB.name}</span>
                </div>
              </div>

              <div className="space-y-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/30">Starts at 06:00 PM</p>
                <CountdownDisplay targetDate={kickoffDate} />
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="live-match"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col gap-6"
          >
            {/* Dynamic Header */}
            <header className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
              >
                <div className="mb-2 flex items-center gap-2">
                  <span className="live-indicator" />
                  <span className="text-[10px] font-bold tracking-[0.4em] text-emerald-400 uppercase">
                    Live Futsal Experience
                  </span>
                </div>
                <h1 className="text-5xl font-bold text-white leading-tight lg:text-7xl">
                  {data.title}
                </h1>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-pane-brighter flex items-center gap-6 rounded-2xl px-6 py-4"
              >
                <div className="text-right">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-1">Elapsed Time</p>
                  <div className="flex items-baseline gap-1 text-3xl font-bold text-emerald-400">
                    {data.elapsedMinutes}
                    <span className="text-xs text-white/40">MIN</span>
                  </div>
                </div>
                <div className="h-10 w-px bg-white/10" />
                <div className="text-right">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-1">Session Limit</p>
                  <div className="flex items-baseline gap-1 text-3xl font-bold text-white/90">
                    {data.slotMinutes}
                    <span className="text-xs text-white/40">MIN</span>
                  </div>
                </div>
              </motion.div>
            </header>

            {/* Progress Bar */}
            <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-white/5">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                className="absolute h-full bg-gradient-to-r from-emerald-600 via-emerald-400 to-sky-400 shadow-[0_0_10px_rgba(16,185,129,0.5)]"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Scoreboard Grid */}
      <section className="grid gap-6 lg:grid-cols-[1fr_auto_1fr]">
        <motion.div
          whileHover={{ y: -5 }}
          className="glass-pane group relative overflow-hidden rounded-[2.5rem] p-8 text-center"
        >
          <div className="absolute -left-10 -top-10 h-40 w-40 rounded-full bg-emerald-500/10 blur-3xl transition-all group-hover:bg-emerald-500/20" />
          <div className="mb-4 flex flex-col items-center">
            <div className="mb-4 h-24 w-24 overflow-hidden rounded-2xl border border-white/10 bg-black/20 p-2 group-hover:border-emerald-500/30 transition-all">
              <img src="/images/team_a.png" alt={teamA.name} className="h-full w-full object-contain" />
            </div>
            <h2 className="text-4xl font-bold text-white tracking-wider">{teamA.name}</h2>
          </div>
          <div className="glow-a relative inline-block">
            <AnimatePresence mode="wait">
              <motion.span
                key={teamA.score}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -20, opacity: 0 }}
                className="block text-9xl font-bold leading-none text-emerald-400 lg:text-[12rem]"
              >
                {teamA.score}
              </motion.span>
            </AnimatePresence>
          </div>
          <div className="mt-8 grid grid-cols-3 gap-3">
            <MatchStatCard icon={AlertCircle} label="Fouls" value={teamA.teamFouls} color="amber" className="p-3 py-4" />
            <MatchStatCard icon={Zap} label="YC" value={teamA.yellowCards} color="sky" className="p-3 py-4" />
            <MatchStatCard icon={ShieldAlert} label="RC" value={teamA.redCards} color="rose" className="p-3 py-4" />
          </div>
        </motion.div>

        <div className="flex items-center justify-center">
          <div className="glass-pane-brighter h-20 w-20 flex items-center justify-center rounded-2xl rotate-45 border-emerald-500/30">
            <span className="text-3xl font-bold text-white/20 -rotate-45">VS</span>
          </div>
        </div>

        <motion.div
          whileHover={{ y: -5 }}
          className="glass-pane group relative overflow-hidden rounded-[2.5rem] p-8 text-center"
        >
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-amber-500/10 blur-3xl transition-all group-hover:bg-amber-500/20" />
          <div className="mb-4 flex flex-col items-center">
            <div className="mb-4 h-24 w-24 overflow-hidden rounded-2xl border border-white/10 bg-black/20 p-2 group-hover:border-amber-500/30 transition-all">
              <img src="/images/team_b.png" alt={teamB.name} className="h-full w-full object-contain" />
            </div>
            <h2 className="text-4xl font-bold text-white tracking-wider">{teamB.name}</h2>
          </div>
          <div className="glow-b relative inline-block">
            <AnimatePresence mode="wait">
              <motion.span
                key={teamB.score}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -20, opacity: 0 }}
                className="block text-9xl font-bold leading-none text-amber-400 lg:text-[12rem]"
              >
                {teamB.score}
              </motion.span>
            </AnimatePresence>
          </div>
          <div className="mt-8 grid grid-cols-3 gap-3">
             <MatchStatCard icon={AlertCircle} label="Fouls" value={teamB.teamFouls} color="amber" className="p-3 py-4" />
             <MatchStatCard icon={Zap} label="YC" value={teamB.yellowCards} color="sky" className="p-3 py-4" />
             <MatchStatCard icon={ShieldAlert} label="RC" value={teamB.redCards} color="rose" className="p-3 py-4" />
          </div>
        </motion.div>
      </section>

      {/* Advanced Visualization Section */}
      <section className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="glass-pane rounded-[2rem] p-6 lg:p-8">
          <div className="mb-6 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-2xl font-bold text-white">
              <Activity className="text-emerald-400" size={24} />
              Tactical Lineups
            </h3>
            <span className="rounded-lg bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-400">
              6 ON 6 MODEL
            </span>
          </div>
          <TacticalCanvas teamA={teamA} teamB={teamB} />
        </div>

        <div className="glass-pane flex flex-col rounded-[2rem] p-6 lg:p-8">
          <div className="mb-6 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-2xl font-bold text-white">
              <History className="text-emerald-400" size={24} />
              Match Timeline
            </h3>
          </div>
          <div className="flex-1 space-y-4 overflow-y-auto pr-2 custom-scrollbar max-h-[500px]">
            <AnimatePresence mode="popLayout">
              {data.events.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center text-white/30">
                  <TrendingUp size={32} className="mb-2 opacity-20" />
                  <p className="text-sm">Ball is rolling. Waiting for events...</p>
                </div>
              ) : (
                data.events.map((event, index) => (
                  <motion.div
                    key={`${event.createdAt}-${index}`}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="group relative flex gap-4"
                  >
                    <div className="relative flex flex-col items-center">
                      <div className="z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-black/40 border border-white/10 group-hover:border-emerald-500/30 transition-colors">
                        <EventIcon type={event.type} />
                      </div>
                      {index < data.events.length - 1 && (
                        <div className="h-full w-px bg-white/5" />
                      )}
                    </div>
                    <div className="flex-1 pb-4">
                      <div className="rounded-2xl bg-white/5 p-4 transition-colors group-hover:bg-white/10">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-bold text-white">{event.playerName}</span>
                          <span className="text-xs font-bold text-emerald-400">{event.minute}&apos;</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-white/40">
                            Team {event.teamKey} • {event.type}
                          </span>
                          <ChevronRight size={14} className="text-white/20 group-hover:text-emerald-400 transition-colors" />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>
        </div>
      </section>

      {/* Photo Gallery Section */}
      <section className="glass-pane rounded-[2rem] p-6 lg:p-8">
        <PhotoGallery />
      </section>
    </main>
  );
}

