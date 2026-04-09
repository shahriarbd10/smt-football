"use client";

import { FormEvent, useMemo, useState } from "react";
import useSWR from "swr";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Settings, 
  Users, 
  Zap, 
  LogOut, 
  ShieldCheck, 
  Lock,
  Clock, 
  Plus, 
  Minus,
  CheckCircle2,
  AlertCircle,
  LayoutDashboard,
  Save,
  Activity,
  Calendar,
  MousePointer2,
  Trash2
} from "lucide-react";
import { TacticalCanvas } from "./shared/TacticalCanvas";

type Player = {
  name: string;
  isStarter: boolean;
  isGoalkeeper: boolean;
  goals: number;
  assists: number;
  position?: { x: number; y: number };
};

type Team = {
  key: "A" | "B";
  name: string;
  score: number;
  players: Player[];
};

type MatchEvent = {
  _id?: string;
  minute: number;
  teamKey: "A" | "B";
  playerName: string;
  type: string;
  createdAt: string;
};

type MatchData = {
  title: string;
  elapsedMinutes: number;
  slotMinutes: number;
  teams: Team[];
  events: MatchEvent[];
  kickoffTime: string;
};

const fetcher = async (url: string): Promise<MatchData> => {
  const response = await fetch(url);
  if (response.status === 401) throw new Error("UNAUTHORIZED");
  if (!response.ok) throw new Error("Could not load admin data");
  return response.json();
};

async function patchMatch(payload: Record<string, unknown>) {
  const response = await fetch("/api/admin/match", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error || "Request failed");
  return data;
}

export default function AdminPanel() {
  const { data, error, mutate, isLoading } = useSWR("/api/admin/match", fetcher);
  
  const [activeTab, setActiveTab] = useState<"overview" | "lineup" | "events">("overview");
  const [email, setEmail] = useState("smtfootball@admin.com");
  const [password, setPassword] = useState("123456");
  const [selectedTeam, setSelectedTeam] = useState<"A" | "B">("A");
  const [playerName, setPlayerName] = useState("");
  const [minute, setMinute] = useState(1);
  const [eventType, setEventType] = useState<"goal" | "assist" | "foul" | "yellow" | "red">("goal");
  const [message, setMessage] = useState("");
  const [scoreInputs, setScoreInputs] = useState<Record<"A" | "B", string>>({ A: "0", B: "0" });

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
      setMessage("Invalid credentials.");
      return;
    }
    setMessage("Logged in successfully.");
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
      setMessage("Match clock syncronized.");
      await mutate();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Sync error.");
    }
  }

  async function updateScore(teamKey: "A" | "B", score: number) {
    try {
      await patchMatch({ action: "setScore", teamKey, score });
      setScoreInputs((prev) => ({ ...prev, [teamKey]: String(Math.max(0, score)) }));
      setMessage("Score updated.");
      await mutate();
    } catch (err) {
      setMessage("Score sync failed.");
    }
  }

  async function submitEvent(e: FormEvent) {
    e.preventDefault();
    if (!playerName) {
      setMessage("Please select a player.");
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
      setMessage(`${eventType.toUpperCase()} recorded for ${playerName}.`);
      await mutate();
    } catch (err) {
      setMessage("Event recording failed.");
    }
  }

  async function saveLineup(team: Team) {
    const starters = team.players.filter((p) => p.isStarter).map((p) => p.name);
    const goalkeeper = team.players.find((p) => p.isGoalkeeper)?.name;

    if (starters.length !== 6) {
      setMessage(`Select exactly 6 starters (currently ${starters.length}).`);
      return;
    }

    if (!goalkeeper) {
      setMessage("Select 1 goalkeeper.");
      return;
    }

    try {
      await patchMatch({
        action: "setLineup",
        teamKey: team.key,
        starters,
        goalkeeper,
      });
      setMessage(`${team.name} lineup confirmed.`);
      await mutate();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Lineup save error.");
    }
  }

  async function handlePlayerPositionChange(teamKey: "A" | "B", playerName: string, x: number, y: number) {
    try {
      // Optimistic update
      const updatedTeams = data?.teams.map(t => {
        if (t.key !== teamKey) return t;
        return {
          ...t,
          players: t.players.map(p => p.name === playerName ? { ...p, position: { x, y } } : p)
        };
      });
      if (updatedTeams) {
        mutate({ ...data!, teams: updatedTeams }, false);
      }

      await patchMatch({
        action: "setPlayerPosition",
        teamKey,
        playerName,
        x,
        y
      });
    } catch (err) {
      setMessage("Failed to save position.");
    }
  }

  async function updatePlayerStatInline(teamKey: "A" | "B", playerName: string, stat: "goals" | "assists", increment: boolean) {
    try {
      await patchMatch({
        action: "updatePlayerStat",
        teamKey,
        playerName,
        stat,
        increment
      });
      mutate();
    } catch (err) {
      setMessage("Failed to update stat.");
    }
  }

  async function removeMatchEvent(event: MatchEvent) {
    try {
      await patchMatch({
        action: "removeEvent",
        eventId: event._id,
        minute: event.minute,
        teamKey: event.teamKey,
        playerName: event.playerName,
        type: event.type,
        createdAt: event.createdAt,
      });
      mutate();
      setMessage("Event removed and stats rolled back.");
    } catch (err: any) {
      setMessage(`Failed to remove event: ${err.message || "Unknown error"}`);
    }
  }

  if (unauthorized) {
    return (
      <main className="mx-auto flex w-full max-w-lg flex-1 items-center justify-center px-4 py-20">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-pane w-full rounded-[2.5rem] p-10 text-center"
        >
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-rose-500/10 text-rose-500">
            <Lock size={40} />
          </div>
          <p className="text-[10px] font-bold tracking-[0.4em] text-rose-400 uppercase mb-2">Access Revoked</p>
          <h1 className="text-4xl font-bold text-white mb-8">Unauthorized</h1>
          <a 
            href="/admin/login"
            className="inline-block w-full rounded-2xl bg-emerald-500 px-6 py-4 font-bold text-black hover:bg-emerald-400 transition-all"
          >
            Go to Login
          </a>
        </motion.div>
      </main>
    );
  }

  if (isLoading || !data) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
          className="h-12 w-12 rounded-full border-4 border-emerald-500/20 border-t-emerald-500"
        />
      </div>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8">
      {/* Header with Navigation */}
      <header className="glass-pane flex flex-col gap-6 rounded-[2rem] p-6 md:flex-row md:items-center md:justify-between" role="banner">
        <div>
          <p className="text-[10px] font-bold tracking-[0.4em] text-emerald-400 uppercase mb-1">HQ Command</p>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <LayoutDashboard className="text-emerald-500" aria-hidden="true" />
            Live Dashboard
          </h1>
        </div>

        <nav className="flex items-center gap-2 rounded-2xl bg-black/20 p-1" aria-label="Admin Navigation">
          {[
            { id: "overview", icon: Settings, label: "Match" },
            { id: "lineup", icon: Users, label: "Squads" },
            { id: "events", icon: Zap, label: "Events" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              aria-current={activeTab === tab.id ? "page" : undefined}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition-all ${
                activeTab === tab.id 
                ? "bg-emerald-500 text-black shadow-lg shadow-emerald-500/20" 
                : "text-white/60 hover:text-white"
              }`}
            >
              <tab.icon size={16} aria-hidden="true" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
          <div className="mx-2 h-6 w-px bg-white/10" aria-hidden="true" />
          <button 
            onClick={logout} 
            className="rounded-xl px-4 py-2 text-white/40 hover:text-rose-400 transition-colors"
            title="Log out"
            aria-label="Log out"
          >
            <LogOut size={18} aria-hidden="true" />
          </button>
        </nav>
      </header>

      {/* Main Content Area */}
      <div className="flex-1">
        <AnimatePresence mode="wait">
          {activeTab === "overview" && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid gap-6 md:grid-cols-2"
            >
              <section className="glass-pane rounded-[2rem] p-8" aria-labelledby="clock-sync-title">
                <h2 id="clock-sync-title" className="mb-6 flex items-center gap-3 text-xl font-bold text-white uppercase">
                  <Clock className="text-emerald-500" aria-hidden="true" />
                  Clock Sync
                </h2>
                <div className="space-y-6">
                  <div className="flex items-center justify-between rounded-2xl bg-black/20 p-6">
                    <span className="text-4xl font-bold text-white tabular-nums">{data.elapsedMinutes}′</span>
                    <div className="flex gap-2">
                       <button 
                        onClick={() => updateClock(Math.max(0, data.elapsedMinutes - 1))}
                        aria-label="Decrease minute"
                        className="h-12 w-12 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 text-white transition-all active:scale-95"
                      >
                        <Minus size={20} />
                      </button>
                      <button 
                         onClick={() => updateClock(Math.min(data.slotMinutes, data.elapsedMinutes + 1))}
                         aria-label="Increase minute"
                        className="h-12 w-12 flex items-center justify-center rounded-xl bg-emerald-500 text-black transition-all active:scale-95 shadow-lg shadow-emerald-500/10"
                      >
                        <Plus size={20} />
                      </button>
                    </div>
                  </div>
                </div>
              </section>

              <section className="glass-pane rounded-[2rem] p-8" aria-labelledby="kickoff-schedule-title">
                <h2 id="kickoff-schedule-title" className="mb-6 flex items-center gap-3 text-xl font-bold text-white uppercase">
                  <Calendar className="text-emerald-500" aria-hidden="true" />
                  Scheduled Kickoff
                </h2>
                <div className="space-y-4">
                  <div className="relative">
                    <input
                      type="datetime-local"
                      value={(() => {
                        try {
                          const date = data.kickoffTime ? new Date(data.kickoffTime) : new Date();
                          if (isNaN(date.getTime())) return new Date().toISOString().slice(0, 16);
                          return new Date(date.getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16);
                        } catch (e) {
                          return new Date().toISOString().slice(0, 16);
                        }
                      })()}
                      onChange={(e) => {
                        try {
                          const newTime = new Date(e.target.value).toISOString();
                          patchMatch({ action: "setKickoffTime", kickoffTime: newTime })
                            .then(() => {
                              setMessage("Kickoff time updated.");
                              mutate();
                            })
                            .catch(() => setMessage("Failed to update schedule."));
                        } catch (err) {
                          setMessage("Invalid date selection.");
                        }
                      }}
                      className="w-full rounded-xl border border-white/5 bg-black/40 px-4 py-3 text-white outline-none focus:border-emerald-500/30 transition-all font-bold"
                    />
                  </div>
                  <p className="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em] ml-2">UTC+6 Bangladesh Standard Time</p>
                </div>
              </section>

              <section className="glass-pane rounded-[2rem] p-8" aria-labelledby="live-scores-title">
                 <h2 id="live-scores-title" className="mb-6 flex items-center gap-3 text-xl font-bold text-white uppercase">
                  <Activity className="text-emerald-500" size={20} aria-hidden="true" />
                  Live Scores
                </h2>
                <div className="grid gap-4">
                  {data.teams.map(team => (
                    <div key={team.key} className="flex items-center justify-between rounded-2xl bg-black/20 p-4">
                      <div className="flex items-center gap-4">
                         <div className={`h-3 w-3 rounded-full ${team.key === 'A' ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : 'bg-amber-500 shadow-[0_0_8px_#f59e0b]'}`} />
                         <span className="font-bold text-white">{team.name}</span>
                      </div>
                      <div className="flex items-center gap-3 text-white">
                        <input
                          type="number"
                          min={0}
                          value={scoreInputs[team.key] ?? String(team.score)}
                          onChange={(e) => {
                            const next = e.target.value;
                            setScoreInputs((prev) => ({ ...prev, [team.key]: next }));
                          }}
                          className="w-20 rounded-lg border border-white/10 bg-black/40 px-2 py-1 text-right text-xl font-bold tabular-nums outline-none focus:border-emerald-500/40"
                        />
                        <button
                          onClick={() => {
                            const parsed = Number(scoreInputs[team.key]);
                            if (Number.isNaN(parsed) || parsed < 0) {
                              setMessage("Please enter a valid score.");
                              return;
                            }
                            updateScore(team.key, parsed);
                          }}
                          className="rounded-lg bg-emerald-500 px-2 py-1 text-[10px] font-bold text-black"
                        >
                          Save
                        </button>
                        <div className="flex gap-1">
                          <button 
                            onClick={() => updateScore(team.key, team.score - 1)}
                            className="h-8 w-8 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-all active:scale-90"
                          >
                            <Minus size={14} />
                          </button>
                          <button 
                            onClick={() => updateScore(team.key, team.score + 1)}
                            className="h-8 w-8 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-all active:scale-90"
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </motion.div>
          )}

          {activeTab === "events" && (
            <motion.div
              key="events"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="glass-pane rounded-[2rem] p-8 max-w-2xl mx-auto"
            >
              <h2 className="mb-6 text-xl font-bold text-white uppercase">Log Match Event</h2>
              <form onSubmit={submitEvent} className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-white/40 ml-2">Active Team</label>
                    <div className="flex gap-2 p-1 rounded-xl bg-black/40">
                      {data.teams.map(t => (
                        <button
                          key={t.key}
                          type="button"
                          onClick={() => {
                            setSelectedTeam(t.key);
                            setPlayerName("");
                          }}
                          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                            selectedTeam === t.key ? "bg-white/10 text-white shadow-lg" : "text-white/40 hover:text-white/60"
                          }`}
                        >
                          {t.name}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-white/40 ml-2">Minute</label>
                    <input
                      type="number"
                      value={minute}
                      onChange={(e) => setMinute(parseInt(e.target.value))}
                      className="w-full rounded-xl border border-white/5 bg-black/40 px-4 py-2.5 text-white outline-none focus:border-emerald-500/30 transition-all font-bold tabular-nums"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-white/40 ml-2">Involved Player</label>
                  <select
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    className="w-full rounded-xl border border-white/5 bg-black/40 px-4 py-2.5 text-white outline-none focus:border-emerald-500/30 transition-all font-bold appearance-none cursor-pointer"
                  >
                    <option value="">Select a player...</option>
                    {players.map((p) => (
                      <option key={p.name} value={p.name}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                   <label className="text-[10px] font-bold uppercase tracking-widest text-white/40 ml-2">Outcome</label>
                   <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                      {[
                        { id: 'goal', color: 'bg-emerald-500', label: 'Goal' },
                        { id: 'assist', color: 'bg-indigo-500', label: 'Assist' },
                        { id: 'foul', color: 'bg-amber-500', label: 'Foul' },
                        { id: 'yellow', color: 'bg-sky-500', label: 'Yellow' },
                        { id: 'red', color: 'bg-rose-500', label: 'Red' },
                      ].map(type => (
                        <button
                          key={type.id}
                          type="button"
                          onClick={() => setEventType(type.id as any)}
                          className={`py-3 rounded-xl border-2 transition-all flex flex-col items-center gap-1 ${
                            eventType === type.id 
                            ? `bg-white/10 border-emerald-500 text-white` 
                            : 'bg-black/20 border-transparent text-white/40 hover:border-white/10'
                          }`}
                        >
                          <div className={`h-2 w-full max-w-[20px] rounded-full ${type.color}`} />
                          <span className="text-[10px] font-bold uppercase">{type.label}</span>
                        </button>
                      ))}
                   </div>
                </div>

                <button className="w-full rounded-2xl bg-emerald-500 py-4 font-bold text-black shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all hover:shadow-[0_0_30px_rgba(16,185,129,0.5)] active:scale-[0.98]">
                  Append Event
                </button>
              </form>

              <div className="mt-8 pt-8 border-t border-white/5 space-y-4">
                <h3 className="text-xs font-bold text-white/40 uppercase tracking-widest ml-2">Session Timeline</h3>
                <div className="flex flex-col gap-3">
                  {data.events.length === 0 ? (
                    <p className="text-center text-xs font-bold text-white/20 uppercase py-4">No events recorded</p>
                  ) : (
                    data.events.map((event, index) => (
                      <div key={event._id ?? `${event.createdAt}-${event.playerName}-${event.minute}-${index}`} className="flex items-center justify-between rounded-xl bg-black/40 p-3 border border-white/5">
                        <div className="flex items-center gap-3">
                          <span className="flex h-6 w-6 items-center justify-center rounded bg-emerald-500/10 text-[10px] font-black text-emerald-500">
                            {event.minute}&apos;
                          </span>
                          <div>
                            <p className="text-[10px] font-black text-white uppercase">{event.playerName}</p>
                            <p className="text-[8px] font-bold text-white/40 uppercase tracking-widest">{event.type}</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => removeMatchEvent(event)}
                          className="rounded-lg p-2 text-rose-500/40 hover:bg-rose-500/10 hover:text-rose-500 transition-colors"
                          title="Remove Event (Reverts Stats)"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === "lineup" && (
            <motion.div
              key="lineup"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid gap-6 lg:grid-cols-2"
            >
              {data.teams.map(team => (
                <div key={team.key} className="glass-pane rounded-[2rem] p-8">
                  <div className="mb-8 flex items-center justify-between">
                    <div>
                      <h3 className="text-xl font-bold text-white uppercase">{team.name} Squad</h3>
                      <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mt-1">
                        {team.players.filter(p => p.isStarter).length}/6 Starters Selected
                      </p>
                    </div>
                    <button 
                      onClick={() => saveLineup(team)}
                      className="flex items-center gap-2 rounded-xl bg-emerald-500/10 px-4 py-2 text-xs font-bold text-emerald-500 transition-all hover:bg-emerald-500/20"
                    >
                      <Save size={14} />
                      Confirm XI
                    </button>
                  </div>

                  <div className="mb-8 p-1 rounded-[2.5rem] bg-black/40 border border-white/5 relative group">
                    <div className="absolute top-4 left-4 z-10 flex items-center gap-2 rounded-full bg-black/60 px-3 py-1.5 text-[8px] font-bold text-white/40 border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity">
                      <MousePointer2 size={10} className="text-emerald-500" />
                      DRAG PLAYERS TO POSITION
                    </div>
                    <TacticalCanvas 
                      teamA={data.teams[0]} 
                      teamB={data.teams[1]} 
                      isEditable={true} 
                      onPlayerPositionChange={handlePlayerPositionChange}
                    />
                  </div>

                  <div className="space-y-2">
                    {team.players.map(player => (
                      <div key={player.name} className="flex items-center gap-4 rounded-2xl bg-black/20 p-4 transition-colors hover:bg-black/30 group">
                        <div className="flex-1">
                          <p className="font-bold text-white text-sm">{player.name}</p>
                          <div className="mt-2 flex gap-4">
                             <div className="flex flex-col gap-1">
                               <span className="text-[7px] font-black text-white/20 uppercase tracking-widest">Goals</span>
                               <div className="flex items-center gap-2">
                                 <button 
                                   onClick={(e) => { e.stopPropagation(); updatePlayerStatInline(team.key, player.name, "goals", false); }}
                                   className="h-5 w-5 rounded bg-white/5 flex items-center justify-center text-white/40 hover:bg-rose-500/20 hover:text-rose-500 transition-colors"
                                 >
                                   -
                                 </button>
                                 <span className="text-[10px] font-black text-emerald-500 w-3 text-center">{player.goals}</span>
                                 <button 
                                   onClick={(e) => { e.stopPropagation(); updatePlayerStatInline(team.key, player.name, "goals", true); }}
                                   className="h-5 w-5 rounded bg-white/5 flex items-center justify-center text-white/40 hover:bg-emerald-500/20 hover:text-emerald-500 transition-colors"
                                 >
                                   +
                                 </button>
                               </div>
                             </div>
                             <div className="flex flex-col gap-1">
                               <span className="text-[7px] font-black text-white/20 uppercase tracking-widest">Assists</span>
                               <div className="flex items-center gap-2">
                                 <button 
                                   onClick={(e) => { e.stopPropagation(); updatePlayerStatInline(team.key, player.name, "assists", false); }}
                                   className="h-5 w-5 rounded bg-white/5 flex items-center justify-center text-white/40 hover:bg-rose-500/20 hover:text-rose-500 transition-colors"
                                 >
                                   -
                                 </button>
                                 <span className="text-[10px] font-black text-indigo-400 w-3 text-center">{player.assists}</span>
                                 <button 
                                   onClick={(e) => { e.stopPropagation(); updatePlayerStatInline(team.key, player.name, "assists", true); }}
                                   className="h-5 w-5 rounded bg-white/5 flex items-center justify-center text-white/40 hover:bg-indigo-500/20 hover:text-indigo-400 transition-colors"
                                 >
                                   +
                                 </button>
                               </div>
                             </div>
                          </div>
                        </div>
                        
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              const updated = data.teams.map(t => {
                                if (t.key !== team.key) return t;
                                return {
                                  ...t,
                                  players: t.players.map(p => p.name === player.name ? { ...p, isStarter: !p.isStarter } : p)
                                };
                              });
                              mutate({ ...data, teams: updated }, false);
                            }}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all ${
                              player.isStarter ? "bg-emerald-500 text-black shadow-lg shadow-emerald-500/20" : "bg-white/5 text-white/40 hover:text-white/60"
                            }`}
                          >
                            Starter
                          </button>
                          
                          <button
                            onClick={() => {
                              const updated = data.teams.map(t => {
                                if (t.key !== team.key) return t;
                                return {
                                  ...t,
                                  players: t.players.map(p => ({ ...p, isGoalkeeper: p.name === player.name ? !p.isGoalkeeper : false }))
                                };
                              });
                              mutate({ ...data, teams: updated }, false);
                            }}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all ${
                              player.isGoalkeeper ? "bg-amber-500 text-black shadow-lg shadow-amber-500/20" : "bg-white/5 text-white/40 hover:text-white/60"
                            }`}
                          >
                            GK
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Persistent Notification Area */}
      <AnimatePresence>
        {message && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 glass-pane rounded-2xl px-6 py-4 flex items-center gap-3 border-emerald-500/30 text-emerald-400 font-bold z-50 shadow-2xl"
          >
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-black">
              <CheckCircle2 size={16} />
            </div>
            {message}
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}

