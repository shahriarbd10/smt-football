"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
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
  Play,
  Square,
  Calendar,
  CalendarDays,
  MousePointer2,
  Trash2,
  UserPlus
} from "lucide-react";
import { TacticalCanvas } from "./shared/TacticalCanvas";
import PhotoGallery from "./PhotoGallery";

type Player = {
  name: string;
  isStarter: boolean;
  isGoalkeeper: boolean;
  goals: number;
  assists: number;
  position?: { x: number; y: number };
  imageUrl?: string;
};

type Team = {
  key: "A" | "B";
  name: string;
  score: number;
  teamFouls: number;
  yellowCards: number;
  redCards: number;
  players: Player[];
};

type MatchEvent = {
  _id?: string;
  matchId?: string;
  matchTitle?: string;
  minute: number;
  teamKey: "A" | "B";
  playerName: string;
  type: string;
  createdAt: string;
};

type PaymentStatus = "paid" | "unpaid" | "pending";

type Member = {
  id: string;
  name: string;
};

type UpcomingEventMemberStatus = {
  memberId: string;
  confirmed: boolean;
  paymentStatus: PaymentStatus;
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

type MatchData = {
  title: string;
  matchLifecycle: "scheduled" | "live" | "ended";
  specialEvent: {
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
  };
  playersPerSide: 6 | 7;
  elapsedMinutes: number;
  slotMinutes: number;
  teams: Team[];
  events: MatchEvent[];
  members: Member[];
  upcomingEvents: UpcomingEvent[];
  matchHistory: Array<{
    id: string;
    title: string;
    playersPerSide: 6 | 7;
    slotMinutes: number;
    elapsedMinutes: number;
    kickoffTime: string;
    teams: Team[];
    events: MatchEvent[];
    updatedAt: string;
  }>;
  kickoffTime: string;
};

const fetcher = async (url: string): Promise<MatchData> => {
  const response = await fetch(url, { cache: "no-store" });
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
  return data as MatchData;
}

export default function AdminPanel() {
  const { data, error, mutate, isLoading } = useSWR("/api/admin/match", fetcher, {
    refreshInterval: 2000,
    revalidateOnFocus: true,
  });
  
  const [activeTab, setActiveTab] = useState<"overview" | "lineup" | "events" | "planning">("overview");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [selectedTeam, setSelectedTeam] = useState<"A" | "B">("A");
  const [playerName, setPlayerName] = useState("");
  const [minute, setMinute] = useState(1);
  const [eventType, setEventType] = useState<"goal" | "assist" | "foul" | "yellow" | "red">("goal");
  const [selectedEventMatchId, setSelectedEventMatchId] = useState("live");
  const [selectedGalleryMatchId, setSelectedGalleryMatchId] = useState("live");
  const [pendingPositionChanges, setPendingPositionChanges] = useState<
    Record<string, { teamKey: "A" | "B"; playerName: string; x: number; y: number }>
  >({});
  const [message, setMessage] = useState("");
  const [scoreInputs, setScoreInputs] = useState<Record<"A" | "B", string>>({ A: "0", B: "0" });
  const [memberNameDraft, setMemberNameDraft] = useState("");
  const [eventTitleDraft, setEventTitleDraft] = useState("Weekly Futsal Slot");
  const [eventDateDraft, setEventDateDraft] = useState("");
  const [eventSlotDraft, setEventSlotDraft] = useState("90");
  const [eventTotalSlotFeeDraft, setEventTotalSlotFeeDraft] = useState("0");
  const [eventNotesDraft, setEventNotesDraft] = useState("");
  const [paidAmountDrafts, setPaidAmountDrafts] = useState<Record<string, string>>({});
  const [kickoffDraft, setKickoffDraft] = useState("");
  const [selectedUpcomingEventId, setSelectedUpcomingEventId] = useState("");
  const [selectedHistoryMatchId, setSelectedHistoryMatchId] = useState("");
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [specialEventDraft, setSpecialEventDraft] = useState({
    enabled: true,
    title: "Special Event Match",
    subtitle: "SMT Gamma vs FSD",
    eventDate: "",
    homeTeamName: "SMT Gamma",
    awayTeamName: "FSD",
    badgeText: "Mainstream Feature Clash",
    venue: "SM Technology Ground",
    gk: "Nayeem, Omar",
    cb: "Rakib, Fahim, Hasib, Polas",
    cmf: "Shahriar, Mynul, Sanim",
    cf: "Jamil, Imtiaz, Israk",
  });
  const upcomingDateInputRef = useRef<HTMLInputElement>(null);

  const unauthorized = error?.message === "UNAUTHORIZED";

  const players = useMemo(() => {
    const team = data?.teams.find((item) => item.key === selectedTeam);
    return team?.players || [];
  }, [data?.teams, selectedTeam]);

  const selectedUpcomingEvent = useMemo(() => {
    if (!data?.upcomingEvents?.length) {
      return undefined;
    }

    const selected = data.upcomingEvents.find((event) => event.id === selectedUpcomingEventId);
    if (selected) return selected;

    const now = Date.now();
    const sorted = [...data.upcomingEvents].sort(
      (a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime(),
    );

    const nextUpcoming = sorted.find((event) => new Date(event.eventDate).getTime() >= now);
    return nextUpcoming || sorted[0];
  }, [data?.upcomingEvents, selectedUpcomingEventId]);

  const allEventDates = useMemo(() => {
    const set = new Set<string>();

    if (data?.kickoffTime) {
      const kickoffDate = new Date(data.kickoffTime);
      if (!Number.isNaN(kickoffDate.getTime())) {
        set.add(kickoffDate.toISOString().slice(0, 10));
      }
    }

    (data?.upcomingEvents || []).forEach((event) => {
      const date = new Date(event.eventDate);
      if (!Number.isNaN(date.getTime())) {
        set.add(date.toISOString().slice(0, 10));
      }
    });

    (data?.events || []).forEach((event) => {
      const createdAt = new Date(event.createdAt);
      if (!Number.isNaN(createdAt.getTime())) {
        set.add(createdAt.toISOString().slice(0, 10));
      }
    });

    return set;
  }, [data?.upcomingEvents, data?.events, data?.kickoffTime]);

  const selectedDateUpcomingEvents = useMemo(
    () =>
      (data?.upcomingEvents || []).filter(
        (event) => new Date(event.eventDate).toISOString().slice(0, 10) === selectedCalendarDate,
      ),
    [data?.upcomingEvents, selectedCalendarDate],
  );

  const selectedDateMatchEvents = useMemo(
    () =>
      [...(data?.events || [])]
        .filter((event) => new Date(event.createdAt).toISOString().slice(0, 10) === selectedCalendarDate)
        .sort((a, b) => a.minute - b.minute),
    [data?.events, selectedCalendarDate],
  );

  const hasCurrentMatchOnSelectedDate = useMemo(() => {
    if (!data?.kickoffTime) return false;
    return new Date(data.kickoffTime).toISOString().slice(0, 10) === selectedCalendarDate;
  }, [data?.kickoffTime, selectedCalendarDate]);

  const selectedHistoryMatch = useMemo(() => {
    if (!data?.matchHistory?.length) return undefined;
    if (!selectedHistoryMatchId) return data.matchHistory[0];
    return data.matchHistory.find((item) => item.id === selectedHistoryMatchId) || data.matchHistory[0];
  }, [data?.matchHistory, selectedHistoryMatchId]);

  useEffect(() => {
    if (!selectedUpcomingEvent) {
      setPaidAmountDrafts({});
      return;
    }

    const nextDrafts: Record<string, string> = {};
    data?.members.forEach((member) => {
      const participant =
        selectedUpcomingEvent.participants.find((item) => item.memberId === member.id) ||
        ({ paidAmount: 0 } as UpcomingEventMemberStatus);
      nextDrafts[`${selectedUpcomingEvent.id}:${member.id}`] = String(participant.paidAmount ?? 0);
    });

    setPaidAmountDrafts(nextDrafts);
  }, [selectedUpcomingEvent?.id, data?.members, selectedUpcomingEvent?.participants]);

  useEffect(() => {
    if (!data?.kickoffTime) return;

    const date = new Date(data.kickoffTime);
    if (Number.isNaN(date.getTime())) return;

    const localValue = new Date(date.getTime() - new Date().getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
    setKickoffDraft(localValue);
  }, [data?.kickoffTime]);

  useEffect(() => {
    if (!data?.specialEvent) return;

    const specialDate = new Date(data.specialEvent.eventDate);
    const localDateValue = Number.isNaN(specialDate.getTime())
      ? ""
      : new Date(specialDate.getTime() - new Date().getTimezoneOffset() * 60000)
          .toISOString()
          .slice(0, 16);

    setSpecialEventDraft({
      enabled: Boolean(data.specialEvent.enabled),
      title: data.specialEvent.title || "Special Event Match",
      subtitle: data.specialEvent.subtitle || "SMT Gamma vs FSD",
      eventDate: localDateValue,
      homeTeamName: data.specialEvent.homeTeamName || "SMT Gamma",
      awayTeamName: data.specialEvent.awayTeamName || "FSD",
      badgeText: data.specialEvent.badgeText || "Mainstream Feature Clash",
      venue: data.specialEvent.venue || "SM Technology Ground",
      gk: (data.specialEvent.squad?.gk || []).join(", "),
      cb: (data.specialEvent.squad?.cb || []).join(", "),
      cmf: (data.specialEvent.squad?.cmf || []).join(", "),
      cf: (data.specialEvent.squad?.cf || []).join(", "),
    });
  }, [data?.specialEvent]);

  const eventLogMatchOptions = useMemo(() => {
    const upcoming = [...(data?.upcomingEvents || [])].sort(
      (a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime(),
    );

    return [
      { id: "live", title: "Live Match" },
      ...upcoming.map((event) => ({
        id: event.id,
        title: `${event.title} (${new Date(event.eventDate).toLocaleDateString()})`,
      })),
    ];
  }, [data?.upcomingEvents]);

  const selectedEventMatchTitle =
    eventLogMatchOptions.find((item) => item.id === selectedEventMatchId)?.title || "Live Match";

  const galleryMatchOptions = useMemo(() => {
    const map = new Map<string, string>();
    map.set("live", "Live Match");

    (data?.upcomingEvents || []).forEach((event) => {
      map.set(event.id, `${event.title} (${new Date(event.eventDate).toLocaleDateString()})`);
    });

    (data?.matchHistory || []).forEach((record) => {
      map.set(record.id, `${record.title} (${new Date(record.kickoffTime).toLocaleDateString()})`);
    });

    return Array.from(map.entries()).map(([id, title]) => ({ id, title }));
  }, [data?.upcomingEvents, data?.matchHistory]);

  const selectedGalleryMatchTitle =
    galleryMatchOptions.find((item) => item.id === selectedGalleryMatchId)?.title || "Live Match";

  const selectedMatchTimelineEvents = useMemo(() => {
    const target = selectedEventMatchId || "live";

    return [...(data?.events || [])]
      .filter((event) => (event.matchId || "live") === target)
      .sort((a, b) => {
        if (a.minute !== b.minute) return a.minute - b.minute;
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      });
  }, [data?.events, selectedEventMatchId]);

  function openNativeDateTimePicker(input: HTMLInputElement | null) {
    if (!input) return;
    const pickerInput = input as HTMLInputElement & { showPicker?: () => void };
    if (typeof pickerInput.showPicker === "function") {
      pickerInput.showPicker();
      return;
    }
    pickerInput.focus();
    pickerInput.click();
  }

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
    if (data?.matchLifecycle !== "live") {
      setMessage("Start match first to run the live clock.");
      return;
    }

    try {
      const updated = await patchMatch({ action: "setElapsedMinutes", elapsedMinutes });
      mutate(updated, false);
      setMessage("Match clock syncronized.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Sync error.");
    }
  }

  async function updateScore(teamKey: "A" | "B", score: number) {
    if (data?.matchLifecycle !== "live") {
      setMessage("Live score updates are allowed only while match is live.");
      return;
    }

    try {
      const updated = await patchMatch({ action: "setScore", teamKey, score });
      mutate(updated, false);
      setScoreInputs((prev) => ({ ...prev, [teamKey]: String(Math.max(0, score)) }));
      setMessage("Score updated.");
    } catch (err) {
      setMessage("Score sync failed.");
    }
  }

  async function updateMatchFormat(playersPerSide: 6 | 7) {
    try {
      await patchMatch({ action: "setPlayersPerSide", playersPerSide });
      setMessage(`Match format updated to ${playersPerSide} vs ${playersPerSide}.`);
      await mutate();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not update match format.");
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
        matchId: selectedEventMatchId,
        matchTitle: selectedEventMatchTitle,
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
    const requiredPlayers = data?.playersPerSide ?? 6;

    if (starters.length !== requiredPlayers) {
      setMessage(`Select exactly ${requiredPlayers} starters (currently ${starters.length}).`);
      return;
    }

    if (!goalkeeper) {
      setMessage("Select 1 goalkeeper.");
      return;
    }

    try {
      await patchMatch({ action: "setLineup", teamKey: team.key, starters, goalkeeper });
      setMessage(`${team.name} lineup confirmed.`);
      await mutate();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "lineup save error.");
    }
  }

  async function updatePlayerImageUrl(teamKey: "A" | "B", playerName: string, imageUrl: string) {
    try {
      await patchMatch({ action: "setPlayerImageUrl", teamKey, playerName, imageUrl });
      setMessage(`Image updated for ${playerName}.`);
      await mutate();
    } catch (err) {
      setMessage("Failed to update player image.");
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

      setPendingPositionChanges((prev) => ({
        ...prev,
        [`${teamKey}:${playerName}`]: { teamKey, playerName, x, y },
      }));
    } catch (err) {
      setMessage("Failed to update position draft.");
    }
  }

  async function saveTacticalSetup() {
    const positions = Object.values(pendingPositionChanges);

    if (positions.length === 0) {
      setMessage("No tactical position changes to save.");
      return;
    }

    try {
      const updated = await patchMatch({
        action: "setPlayerPositionsBulk",
        positions,
      });
      mutate(updated, false);
      setPendingPositionChanges({});
      setMessage("Tactical setup saved and synced to public page.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not save tactical setup.");
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
        matchId: event.matchId || "live",
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

  async function updateMatchEventRecord(
    event: MatchEvent,
    updates: {
      minute?: number;
      teamKey?: "A" | "B";
      playerName?: string;
      type?: "goal" | "assist" | "foul" | "yellow" | "red";
    },
  ) {
    try {
      await patchMatch({
        action: "updateEvent",
        eventId: event._id,
        matchId: event.matchId || "live",
        minute: event.minute,
        teamKey: event.teamKey,
        playerName: event.playerName,
        type: event.type,
        createdAt: event.createdAt,
        newMatchId: event.matchId || "live",
        newMatchTitle: event.matchTitle || "Live Match",
        newMinute: updates.minute,
        newTeamKey: updates.teamKey,
        newPlayerName: updates.playerName,
        newType: updates.type,
      });
      setMessage("Timeline event updated.");
      await mutate();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not update timeline event.");
    }
  }

  async function addMember() {
    const name = memberNameDraft.trim();
    if (!name) {
      setMessage("Member name is required.");
      return;
    }

    try {
      await patchMatch({ action: "upsertMember", name });
      setMemberNameDraft("");
      setMessage("Member added.");
      await mutate();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not add member.");
    }
  }

  async function updateMemberName(memberId: string, name: string) {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setMessage("Member name cannot be empty.");
      return;
    }

    try {
      await patchMatch({ action: "upsertMember", id: memberId, name: trimmedName });
      setMessage("Member updated.");
      await mutate();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not update member.");
    }
  }

  async function deleteMember(memberId: string) {
    try {
      await patchMatch({ action: "removeMember", memberId });
      setMessage("Member removed.");
      await mutate();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not remove member.");
    }
  }

  async function addUpcomingEvent() {
    if (!eventDateDraft) {
      setMessage("Please select a date and time for the event.");
      return;
    }

    try {
      const parsedSlot = Number(eventSlotDraft);
      const parsedTotalSlotFee = Number(eventTotalSlotFeeDraft);
      await patchMatch({
        action: "upsertUpcomingEvent",
        title: eventTitleDraft,
        eventDate: new Date(eventDateDraft).toISOString(),
        slotMinutes: Number.isNaN(parsedSlot) ? 90 : parsedSlot,
        totalSlotFee: Number.isNaN(parsedTotalSlotFee) ? 0 : parsedTotalSlotFee,
        notes: eventNotesDraft,
      });
      setMessage("Upcoming slot created.");
      await mutate();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not create upcoming slot.");
    }
  }

  async function deleteUpcomingEvent(eventId: string) {
    try {
      await patchMatch({ action: "removeUpcomingEvent", eventId });
      if (selectedUpcomingEventId === eventId) {
        setSelectedUpcomingEventId("");
      }
      setMessage("Upcoming event removed.");
      await mutate();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not remove event.");
    }
  }

  async function updateUpcomingEventRecord(
    eventId: string,
    payload: {
      title: string;
      eventDate: string;
      slotMinutes: number;
      totalSlotFee: number;
      notes?: string;
    },
  ) {
    try {
      await patchMatch({
        action: "upsertUpcomingEvent",
        id: eventId,
        title: payload.title,
        eventDate: payload.eventDate,
        slotMinutes: payload.slotMinutes,
        totalSlotFee: payload.totalSlotFee,
        notes: payload.notes,
      });
      setMessage("Upcoming event updated.");
      await mutate();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not update upcoming event.");
    }
  }

  async function updateHistoryMatchRecord(input: {
    id: string;
    title?: string;
    kickoffTime?: string;
    slotMinutes?: number;
    elapsedMinutes?: number;
    teamStats?: Array<{
      teamKey: "A" | "B";
      score?: number;
      teamFouls?: number;
      yellowCards?: number;
      redCards?: number;
    }>;
  }) {
    try {
      await patchMatch({ action: "updateMatchHistoryRecord", ...input });
      setMessage("Previous match updated.");
      await mutate();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not update previous match record.");
    }
  }

  async function startLiveMatch(resetLive = true) {
    try {
      const updated = await patchMatch({ action: "startMatchNow", resetLive });
      mutate(updated, false);
      setMessage("Match started and live controls are active.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not start match.");
    }
  }

  async function saveKickoffSchedule() {
    if (!kickoffDraft) {
      setMessage("Please select kickoff date and time.");
      return;
    }

    const parsed = new Date(kickoffDraft);
    if (Number.isNaN(parsed.getTime())) {
      setMessage("Invalid kickoff date/time.");
      return;
    }

    try {
      const updated = await patchMatch({ action: "setKickoffTime", kickoffTime: parsed.toISOString() });
      mutate(updated, false);
      setMessage("Kickoff time updated by admin.");
    } catch {
      setMessage("Failed to update schedule.");
    }
  }

  async function endLiveMatch() {
    try {
      const updated = await patchMatch({ action: "endCurrentMatch" });
      mutate(updated, false);
      setMessage("Match ended and archived as record.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not end match.");
    }
  }

  async function saveSpecialEventConfig() {
    const toList = (raw: string) =>
      raw
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);

    const eventDateIso = specialEventDraft.eventDate
      ? new Date(specialEventDraft.eventDate).toISOString()
      : undefined;

    try {
      const updated = await patchMatch({
        action: "setSpecialEvent",
        enabled: specialEventDraft.enabled,
        title: specialEventDraft.title,
        subtitle: specialEventDraft.subtitle,
        eventDate: eventDateIso,
        homeTeamName: specialEventDraft.homeTeamName,
        awayTeamName: specialEventDraft.awayTeamName,
        badgeText: specialEventDraft.badgeText,
        venue: specialEventDraft.venue,
        squad: {
          gk: toList(specialEventDraft.gk),
          cb: toList(specialEventDraft.cb),
          cmf: toList(specialEventDraft.cmf),
          cf: toList(specialEventDraft.cf),
        },
      });
      mutate(updated, false);
      setMessage("Special event configuration updated.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not save special event config.");
    }
  }

  async function setMemberAttendanceStatus(
    eventId: string,
    memberId: string,
    partial: { confirmed?: boolean; paymentStatus?: PaymentStatus; paidAmount?: number },
  ) {
    try {
      await patchMatch({ action: "setUpcomingMemberStatus", eventId, memberId, ...partial });
      await mutate();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not update member status.");
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
            { id: "planning", icon: CalendarDays, label: "Planning" },
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
                  <div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/25 px-4 py-3">
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/50">Lifecycle</span>
                    <span
                      className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] ${
                        data.matchLifecycle === "live"
                          ? "bg-emerald-500/20 text-emerald-300"
                          : data.matchLifecycle === "ended"
                            ? "bg-amber-500/20 text-amber-300"
                            : "bg-sky-500/20 text-sky-300"
                      }`}
                    >
                      {data.matchLifecycle}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => startLiveMatch(true)}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-3 py-2 text-xs font-bold text-black"
                    >
                      <Play size={14} /> Start Match
                    </button>
                    <button
                      onClick={endLiveMatch}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-rose-500 px-3 py-2 text-xs font-bold text-black"
                    >
                      <Square size={14} /> End Match
                    </button>
                  </div>

                  <div className="flex items-center justify-between rounded-2xl bg-black/20 p-6">
                    <span className="text-4xl font-bold text-white tabular-nums">{data.elapsedMinutes}′</span>
                    <div className="flex gap-2">
                       <button 
                        onClick={() => updateClock(Math.max(0, data.elapsedMinutes - 1))}
                        aria-label="Decrease minute"
                        disabled={data.matchLifecycle !== "live"}
                        className="h-12 w-12 flex items-center justify-center rounded-xl bg-white/5 text-white transition-all active:scale-95 enabled:hover:bg-white/10 disabled:opacity-40"
                      >
                        <Minus size={20} />
                      </button>
                      <button 
                         onClick={() => updateClock(Math.min(data.slotMinutes, data.elapsedMinutes + 1))}
                         aria-label="Increase minute"
                        disabled={data.matchLifecycle !== "live"}
                        className="h-12 w-12 flex items-center justify-center rounded-xl bg-emerald-500 text-black transition-all active:scale-95 shadow-lg shadow-emerald-500/10 disabled:opacity-40"
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
                      value={kickoffDraft}
                      onChange={(e) => setKickoffDraft(e.target.value)}
                      className="w-full rounded-xl border border-white/5 bg-black/40 px-4 py-3 text-white outline-none focus:border-emerald-500/30 transition-all font-bold"
                    />
                  </div>
                  <button
                    onClick={saveKickoffSchedule}
                    className="rounded-xl bg-emerald-500 px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-black"
                  >
                    Save Kickoff
                  </button>
                  <p className="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em] ml-2">UTC+6 Bangladesh Standard Time</p>
                  <p className="text-[10px] font-bold text-emerald-300/70 uppercase tracking-[0.2em] ml-2">
                    Auto starts when kickoff time matches current country time window
                  </p>
                </div>
              </section>

              <section className="glass-pane rounded-[2rem] p-8 md:col-span-2" aria-labelledby="special-event-title">
                <h2 id="special-event-title" className="mb-6 flex items-center gap-3 text-xl font-bold text-white uppercase">
                  <Zap className="text-emerald-500" size={20} aria-hidden="true" />
                  Special Event Banner Control
                </h2>

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="col-span-2 flex items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs font-bold text-white/80">
                    <input
                      type="checkbox"
                      checked={specialEventDraft.enabled}
                      onChange={(e) => setSpecialEventDraft((prev) => ({ ...prev, enabled: e.target.checked }))}
                    />
                    Enable special event banner on homepage
                  </label>

                  <input
                    value={specialEventDraft.title}
                    onChange={(e) => setSpecialEventDraft((prev) => ({ ...prev, title: e.target.value }))}
                    placeholder="Banner title"
                    className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm font-bold text-white outline-none focus:border-emerald-500/40"
                  />
                  <input
                    value={specialEventDraft.subtitle}
                    onChange={(e) => setSpecialEventDraft((prev) => ({ ...prev, subtitle: e.target.value }))}
                    placeholder="Match headline"
                    className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm font-bold text-white outline-none focus:border-emerald-500/40"
                  />

                  <input
                    type="datetime-local"
                    value={specialEventDraft.eventDate}
                    onChange={(e) => setSpecialEventDraft((prev) => ({ ...prev, eventDate: e.target.value }))}
                    className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm font-bold text-white outline-none focus:border-emerald-500/40"
                  />
                  <input
                    value={specialEventDraft.badgeText}
                    onChange={(e) => setSpecialEventDraft((prev) => ({ ...prev, badgeText: e.target.value }))}
                    placeholder="Badge text"
                    className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm font-bold text-white outline-none focus:border-emerald-500/40"
                  />

                  <input
                    value={specialEventDraft.homeTeamName}
                    onChange={(e) => setSpecialEventDraft((prev) => ({ ...prev, homeTeamName: e.target.value }))}
                    placeholder="Home team"
                    className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm font-bold text-white outline-none focus:border-emerald-500/40"
                  />
                  <input
                    value={specialEventDraft.awayTeamName}
                    onChange={(e) => setSpecialEventDraft((prev) => ({ ...prev, awayTeamName: e.target.value }))}
                    placeholder="Away team"
                    className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm font-bold text-white outline-none focus:border-emerald-500/40"
                  />

                  <input
                    value={specialEventDraft.venue}
                    onChange={(e) => setSpecialEventDraft((prev) => ({ ...prev, venue: e.target.value }))}
                    placeholder="Venue"
                    className="col-span-2 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm font-bold text-white outline-none focus:border-emerald-500/40"
                  />

                  <input
                    value={specialEventDraft.gk}
                    onChange={(e) => setSpecialEventDraft((prev) => ({ ...prev, gk: e.target.value }))}
                    placeholder="GK list, comma separated"
                    className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm font-bold text-white outline-none focus:border-emerald-500/40"
                  />
                  <input
                    value={specialEventDraft.cb}
                    onChange={(e) => setSpecialEventDraft((prev) => ({ ...prev, cb: e.target.value }))}
                    placeholder="CB list, comma separated"
                    className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm font-bold text-white outline-none focus:border-emerald-500/40"
                  />
                  <input
                    value={specialEventDraft.cmf}
                    onChange={(e) => setSpecialEventDraft((prev) => ({ ...prev, cmf: e.target.value }))}
                    placeholder="CMF list, comma separated"
                    className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm font-bold text-white outline-none focus:border-emerald-500/40"
                  />
                  <input
                    value={specialEventDraft.cf}
                    onChange={(e) => setSpecialEventDraft((prev) => ({ ...prev, cf: e.target.value }))}
                    placeholder="CF list, comma separated"
                    className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm font-bold text-white outline-none focus:border-emerald-500/40"
                  />
                </div>

                <button
                  onClick={saveSpecialEventConfig}
                  className="mt-5 rounded-xl bg-emerald-500 px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-black"
                >
                  Save Special Event
                </button>
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

              <section className="glass-pane rounded-[2rem] p-8" aria-labelledby="format-title">
                <h2 id="format-title" className="mb-6 flex items-center gap-3 text-xl font-bold text-white uppercase">
                  <Users className="text-emerald-500" size={20} aria-hidden="true" />
                  Match Format
                </h2>
                <div className="rounded-2xl bg-black/20 p-4">
                  <p className="mb-2 text-xs font-bold uppercase tracking-widest text-white/50">
                    Players Per Side (Including Goalkeeper)
                  </p>
                  <div className="flex gap-2">
                    {[6, 7].map((count) => (
                      <button
                        key={count}
                        onClick={() => updateMatchFormat(count as 6 | 7)}
                        className={`rounded-xl px-4 py-2 text-sm font-bold transition-all ${
                          data.playersPerSide === count
                            ? "bg-emerald-500 text-black"
                            : "bg-white/10 text-white/70 hover:bg-white/20"
                        }`}
                      >
                        {count} vs {count}
                      </button>
                    ))}
                  </div>
                </div>
              </section>

              <section className="glass-pane rounded-[2rem] p-8" aria-labelledby="data-editor-title">
                <h2 id="data-editor-title" className="mb-6 flex items-center gap-3 text-xl font-bold text-white uppercase">
                  <Settings className="text-emerald-500" size={20} aria-hidden="true" />
                  Match Data Editor
                </h2>

                <div className="grid gap-3">
                  <div className="rounded-xl bg-black/20 p-3">
                    <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.2em] text-white/50">Match Title</label>
                    <input
                      defaultValue={data.title}
                      onBlur={async (e) => {
                        const value = e.target.value.trim();
                        if (!value || value === data.title) return;
                        const updated = await patchMatch({ action: "setMatchMetadata", title: value });
                        mutate(updated, false);
                        setMessage("Match title updated.");
                      }}
                      className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm font-bold text-white outline-none focus:border-emerald-500/40"
                    />
                  </div>

                  <div className="rounded-xl bg-black/20 p-3">
                    <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.2em] text-white/50">Slot Minutes</label>
                    <input
                      type="number"
                      min={30}
                      defaultValue={data.slotMinutes}
                      onBlur={async (e) => {
                        const value = Number(e.target.value);
                        if (Number.isNaN(value) || value === data.slotMinutes) return;
                        const updated = await patchMatch({ action: "setMatchMetadata", slotMinutes: value });
                        mutate(updated, false);
                        setMessage("Slot minutes updated.");
                      }}
                      className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm font-bold text-white outline-none focus:border-emerald-500/40"
                    />
                  </div>

                  {data.teams.map((team) => (
                    <div key={`team-stats-editor-${team.key}`} className="rounded-xl bg-black/20 p-3">
                      <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-white/50">{team.name} Advanced Stats</p>
                      <div className="grid grid-cols-3 gap-2">
                        <input
                          type="number"
                          min={0}
                          defaultValue={team.teamFouls ?? 0}
                          placeholder="Fouls"
                          onBlur={async (e) => {
                            const value = Number(e.target.value);
                            if (Number.isNaN(value) || value === team.teamFouls) return;
                            const updated = await patchMatch({ action: "setTeamStats", teamKey: team.key, teamFouls: value });
                            mutate(updated, false);
                            setMessage(`${team.name} fouls updated.`);
                          }}
                          className="rounded-lg border border-white/10 bg-black/40 px-2 py-1 text-xs font-bold text-white outline-none"
                        />
                        <input
                          type="number"
                          min={0}
                          defaultValue={team.yellowCards ?? 0}
                          placeholder="Yellow"
                          onBlur={async (e) => {
                            const value = Number(e.target.value);
                            if (Number.isNaN(value) || value === team.yellowCards) return;
                            const updated = await patchMatch({ action: "setTeamStats", teamKey: team.key, yellowCards: value });
                            mutate(updated, false);
                            setMessage(`${team.name} yellow cards updated.`);
                          }}
                          className="rounded-lg border border-white/10 bg-black/40 px-2 py-1 text-xs font-bold text-white outline-none"
                        />
                        <input
                          type="number"
                          min={0}
                          defaultValue={team.redCards ?? 0}
                          placeholder="Red"
                          onBlur={async (e) => {
                            const value = Number(e.target.value);
                            if (Number.isNaN(value) || value === team.redCards) return;
                            const updated = await patchMatch({ action: "setTeamStats", teamKey: team.key, redCards: value });
                            mutate(updated, false);
                            setMessage(`${team.name} red cards updated.`);
                          }}
                          className="rounded-lg border border-white/10 bg-black/40 px-2 py-1 text-xs font-bold text-white outline-none"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="glass-pane rounded-[2rem] p-8" aria-labelledby="previous-matches-title">
                <h2 id="previous-matches-title" className="mb-6 flex items-center gap-3 text-xl font-bold text-white uppercase">
                  <CalendarDays className="text-emerald-500" size={20} aria-hidden="true" />
                  Previous Match Records
                </h2>

                {!data.matchHistory || data.matchHistory.length === 0 ? (
                  <p className="rounded-xl border border-white/10 bg-black/20 p-3 text-xs font-bold uppercase tracking-[0.2em] text-white/40">
                    No previous matches yet
                  </p>
                ) : (
                  <div className="space-y-4">
                    <select
                      value={selectedHistoryMatch?.id || ""}
                      onChange={(e) => setSelectedHistoryMatchId(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm font-bold text-white outline-none focus:border-emerald-500/40"
                    >
                      {data.matchHistory
                        .slice()
                        .sort((a, b) => new Date(b.kickoffTime).getTime() - new Date(a.kickoffTime).getTime())
                        .map((record) => (
                          <option key={record.id} value={record.id}>
                            {record.title} ({new Date(record.kickoffTime).toLocaleDateString()})
                          </option>
                        ))}
                    </select>

                    {selectedHistoryMatch ? (
                      <div className="space-y-3 rounded-xl border border-white/10 bg-black/20 p-3">
                        <input
                          defaultValue={selectedHistoryMatch.title}
                          key={`history-title-${selectedHistoryMatch.id}`}
                          onBlur={(e) => {
                            const value = e.target.value.trim();
                            if (!value || value === selectedHistoryMatch.title) return;
                            updateHistoryMatchRecord({ id: selectedHistoryMatch.id, title: value });
                          }}
                          className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm font-bold text-white outline-none focus:border-emerald-500/40"
                        />

                        <div className="grid gap-2 sm:grid-cols-2">
                          <input
                            type="datetime-local"
                            key={`history-kickoff-${selectedHistoryMatch.id}`}
                            defaultValue={new Date(
                              new Date(selectedHistoryMatch.kickoffTime).getTime() - new Date().getTimezoneOffset() * 60000,
                            )
                              .toISOString()
                              .slice(0, 16)}
                            onBlur={(e) => {
                              if (!e.target.value) return;
                              updateHistoryMatchRecord({
                                id: selectedHistoryMatch.id,
                                kickoffTime: new Date(e.target.value).toISOString(),
                              });
                            }}
                            className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs font-bold text-white outline-none focus:border-emerald-500/40"
                          />
                          <input
                            type="number"
                            min={30}
                            key={`history-slot-${selectedHistoryMatch.id}`}
                            defaultValue={selectedHistoryMatch.slotMinutes}
                            onBlur={(e) => {
                              const value = Number(e.target.value);
                              if (Number.isNaN(value) || value === selectedHistoryMatch.slotMinutes) return;
                              updateHistoryMatchRecord({ id: selectedHistoryMatch.id, slotMinutes: value });
                            }}
                            className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs font-bold text-white outline-none focus:border-emerald-500/40"
                          />
                        </div>

                        {selectedHistoryMatch.teams.map((team) => (
                          <div key={`history-team-${selectedHistoryMatch.id}-${team.key}`} className="rounded-lg border border-white/10 bg-black/30 p-3">
                            <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-white/50">{team.name} Stats</p>
                            <div className="grid grid-cols-4 gap-2">
                              <input
                                type="number"
                                min={0}
                                defaultValue={team.score}
                                onBlur={(e) => {
                                  const value = Number(e.target.value);
                                  if (Number.isNaN(value) || value === team.score) return;
                                  updateHistoryMatchRecord({
                                    id: selectedHistoryMatch.id,
                                    teamStats: [{ teamKey: team.key, score: value }],
                                  });
                                }}
                                className="rounded-md border border-white/10 bg-black/40 px-2 py-1 text-xs font-bold text-white outline-none"
                                placeholder="Score"
                              />
                              <input
                                type="number"
                                min={0}
                                defaultValue={team.teamFouls}
                                onBlur={(e) => {
                                  const value = Number(e.target.value);
                                  if (Number.isNaN(value) || value === team.teamFouls) return;
                                  updateHistoryMatchRecord({
                                    id: selectedHistoryMatch.id,
                                    teamStats: [{ teamKey: team.key, teamFouls: value }],
                                  });
                                }}
                                className="rounded-md border border-white/10 bg-black/40 px-2 py-1 text-xs font-bold text-white outline-none"
                                placeholder="Fouls"
                              />
                              <input
                                type="number"
                                min={0}
                                defaultValue={team.yellowCards}
                                onBlur={(e) => {
                                  const value = Number(e.target.value);
                                  if (Number.isNaN(value) || value === team.yellowCards) return;
                                  updateHistoryMatchRecord({
                                    id: selectedHistoryMatch.id,
                                    teamStats: [{ teamKey: team.key, yellowCards: value }],
                                  });
                                }}
                                className="rounded-md border border-white/10 bg-black/40 px-2 py-1 text-xs font-bold text-white outline-none"
                                placeholder="YC"
                              />
                              <input
                                type="number"
                                min={0}
                                defaultValue={team.redCards}
                                onBlur={(e) => {
                                  const value = Number(e.target.value);
                                  if (Number.isNaN(value) || value === team.redCards) return;
                                  updateHistoryMatchRecord({
                                    id: selectedHistoryMatch.id,
                                    teamStats: [{ teamKey: team.key, redCards: value }],
                                  });
                                }}
                                className="rounded-md border border-white/10 bg-black/40 px-2 py-1 text-xs font-bold text-white outline-none"
                                placeholder="RC"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                )}
              </section>

              <section className="glass-pane rounded-[2rem] p-8 md:col-span-2" aria-labelledby="gallery-control-title">
                <h2 id="gallery-control-title" className="mb-6 flex items-center gap-3 text-xl font-bold text-white uppercase">
                  <CalendarDays className="text-emerald-500" size={20} aria-hidden="true" />
                  Public Gallery Management
                </h2>

                <div className="mb-4">
                  <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.2em] text-white/45">
                    Gallery Match Context
                  </label>
                  <select
                    value={selectedGalleryMatchId}
                    onChange={(e) => setSelectedGalleryMatchId(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm font-bold text-white outline-none focus:border-emerald-500/40"
                  >
                    {galleryMatchOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.title}
                      </option>
                    ))}
                  </select>
                </div>

                <PhotoGallery
                  mode="admin"
                  matchId={selectedGalleryMatchId}
                  matchTitle={selectedGalleryMatchTitle}
                />
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
                  <div className="space-y-2 sm:col-span-2">
                    <label className="ml-2 text-[10px] font-bold uppercase tracking-widest text-white/40">Match Context</label>
                    <select
                      value={selectedEventMatchId}
                      onChange={(e) => setSelectedEventMatchId(e.target.value)}
                      className="w-full rounded-xl border border-white/5 bg-black/40 px-4 py-2.5 text-white outline-none transition-all focus:border-emerald-500/30"
                    >
                      {eventLogMatchOptions.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.title}
                        </option>
                      ))}
                    </select>
                  </div>

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
                  {selectedMatchTimelineEvents.length === 0 ? (
                    <p className="text-center text-xs font-bold text-white/20 uppercase py-4">No events recorded</p>
                  ) : (
                    selectedMatchTimelineEvents.map((event, index) => (
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

          {activeTab === "planning" && (
            <motion.div
              key="planning"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid gap-6 xl:grid-cols-[1.1fr_1fr]"
            >
              <section className="glass-pane rounded-[2rem] p-6 md:p-8">
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-white uppercase">Member Registry</h2>
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">
                      Total Members: {data.members.length}
                    </p>
                  </div>
                </div>

                <div className="mb-4 flex gap-2">
                  <input
                    value={memberNameDraft}
                    onChange={(e) => setMemberNameDraft(e.target.value)}
                    placeholder="Add new member"
                    className="flex-1 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm font-bold text-white outline-none focus:border-emerald-500/40"
                  />
                  <button
                    onClick={addMember}
                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-3 py-2 text-xs font-bold text-black"
                  >
                    <UserPlus size={14} />
                    Add
                  </button>
                </div>

                <div className="space-y-2">
                  {data.members.map((member) => (
                    <div key={member.id} className="flex items-center gap-2 rounded-xl border border-white/5 bg-black/25 p-2">
                      <input
                        defaultValue={member.name}
                        onBlur={(e) => {
                          if (e.target.value !== member.name) {
                            updateMemberName(member.id, e.target.value);
                          }
                        }}
                        className="flex-1 rounded-lg border border-white/10 bg-black/30 px-2 py-1 text-sm font-bold text-white outline-none focus:border-emerald-500/40"
                      />
                      <button
                        onClick={() => deleteMember(member.id)}
                        className="rounded-lg p-2 text-rose-400 hover:bg-rose-500/10"
                        title="Remove member"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </section>

              <section className="glass-pane rounded-[2rem] p-6 md:p-8">
                <h2 className="mb-4 text-xl font-bold text-white uppercase">Upcoming Slots & Calendar</h2>

                <div className="grid gap-2 sm:grid-cols-2">
                  <input
                    value={eventTitleDraft}
                    onChange={(e) => setEventTitleDraft(e.target.value)}
                    placeholder="Event title"
                    className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm font-bold text-white outline-none focus:border-emerald-500/40"
                  />
                  <div className="relative">
                    <input
                      ref={upcomingDateInputRef}
                      type="datetime-local"
                      value={eventDateDraft}
                      onChange={(e) => setEventDateDraft(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 pr-10 text-sm font-bold text-white outline-none focus:border-emerald-500/40"
                    />
                    <button
                      type="button"
                      onClick={() => openNativeDateTimePicker(upcomingDateInputRef.current)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-emerald-300 hover:bg-emerald-500/15"
                      title="Open calendar"
                      aria-label="Open calendar"
                    >
                      <Calendar size={16} />
                    </button>
                  </div>
                  <input
                    type="number"
                    min={30}
                    value={eventSlotDraft}
                    onChange={(e) => setEventSlotDraft(e.target.value)}
                    placeholder="Slot minutes"
                    className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm font-bold text-white outline-none focus:border-emerald-500/40"
                  />
                  <input
                    type="number"
                    min={0}
                    value={eventTotalSlotFeeDraft}
                    onChange={(e) => setEventTotalSlotFeeDraft(e.target.value)}
                    placeholder="Total slot fee"
                    className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm font-bold text-white outline-none focus:border-emerald-500/40"
                  />
                  <button
                    onClick={addUpcomingEvent}
                    className="rounded-xl bg-emerald-500 px-3 py-2 text-xs font-bold text-black"
                  >
                    Save Upcoming Slot
                  </button>
                  <input
                    value={eventNotesDraft}
                    onChange={(e) => setEventNotesDraft(e.target.value)}
                    placeholder="Notes (optional)"
                    className="sm:col-span-2 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm font-bold text-white outline-none focus:border-emerald-500/40"
                  />
                </div>

                <div className="mt-5 grid gap-3">
                  {data.upcomingEvents.length === 0 ? (
                    <p className="rounded-xl border border-white/10 bg-black/20 p-3 text-xs font-bold uppercase tracking-[0.18em] text-white/35">
                      No upcoming events yet
                    </p>
                  ) : (
                    data.upcomingEvents.map((event) => {
                      const date = new Date(event.eventDate);
                      return (
                        <div
                          key={event.id}
                          className={`rounded-xl border p-3 ${
                            selectedUpcomingEvent?.id === event.id
                              ? "border-emerald-500/50 bg-emerald-500/10"
                              : "border-white/10 bg-black/25"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <button
                              onClick={() => setSelectedUpcomingEventId(event.id)}
                              className="text-left"
                            >
                              <p className="text-sm font-bold text-white">{event.title}</p>
                              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/45">
                                {date.toLocaleString()} | {event.slotMinutes} min | Fee {event.totalSlotFee}
                              </p>
                            </button>
                            <button
                              onClick={() => deleteUpcomingEvent(event.id)}
                              className="rounded-lg p-2 text-rose-400 hover:bg-rose-500/10"
                              title="Delete upcoming event"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-white/50">Event Calendar Indicators</p>
                  <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-white/45">
                    {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
                      <span key={day} className="py-1">{day}</span>
                    ))}
                  </div>
                  {(() => {
                    const now = new Date();
                    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
                    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                    const cells: Array<{ key: string; day?: number; dateKey?: string }> = [];

                    for (let i = 0; i < monthStart.getDay(); i += 1) {
                      cells.push({ key: `empty-${i}` });
                    }

                    for (let day = 1; day <= monthEnd.getDate(); day += 1) {
                      const date = new Date(now.getFullYear(), now.getMonth(), day);
                      cells.push({
                        key: `day-${day}`,
                        day,
                        dateKey: date.toISOString().slice(0, 10),
                      });
                    }

                    return (
                      <div className="mt-2 grid grid-cols-7 gap-1">
                        {cells.map((cell) => {
                          if (!cell.day) {
                            return <div key={cell.key} className="h-8" />;
                          }

                          const hasEvent = cell.dateKey ? allEventDates.has(cell.dateKey) : false;
                          const isSelected = cell.dateKey === selectedCalendarDate;

                          return (
                            <button
                              key={cell.key}
                              type="button"
                              onClick={() => {
                                if (cell.dateKey) {
                                  setSelectedCalendarDate(cell.dateKey);
                                }
                              }}
                              className={`relative flex h-8 items-center justify-center rounded-lg text-xs font-bold ${
                                isSelected
                                  ? "bg-emerald-500 text-black"
                                  : hasEvent
                                    ? "bg-emerald-500/20 text-emerald-300"
                                    : "bg-black/30 text-white/65"
                              }`}
                            >
                              {cell.day}
                              {hasEvent && !isSelected ? (
                                <span className="absolute bottom-1 h-1.5 w-1.5 rounded-full bg-emerald-400" />
                              ) : null}
                            </button>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>

                <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-white/50">
                    Records On {selectedCalendarDate}
                  </p>

                  {hasCurrentMatchOnSelectedDate ? (
                    <div className="mb-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3">
                      <p className="text-sm font-bold text-white">Current Match Session</p>
                      <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/60">
                        Kickoff {new Date(data.kickoffTime).toLocaleString()} | Live {data.elapsedMinutes}/{data.slotMinutes} min
                      </p>
                    </div>
                  ) : null}

                  <div className="space-y-3">
                    {selectedDateUpcomingEvents.map((event) => (
                      <div key={`calendar-upcoming-${event.id}`} className="rounded-xl border border-white/10 bg-black/30 p-3">
                        <p className="mb-2 text-xs font-bold uppercase tracking-[0.12em] text-emerald-300">Upcoming Slot</p>
                        <input
                          defaultValue={event.title}
                          onBlur={(e) => {
                            if (e.target.value !== event.title) {
                              updateUpcomingEventRecord(event.id, {
                                title: e.target.value,
                                eventDate: event.eventDate,
                                slotMinutes: event.slotMinutes,
                                totalSlotFee: event.totalSlotFee,
                                notes: event.notes,
                              });
                            }
                          }}
                          className="mb-2 w-full rounded-lg border border-white/10 bg-black/40 px-2 py-1 text-sm font-bold text-white outline-none"
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <div className="relative">
                            <input
                              type="datetime-local"
                              defaultValue={new Date(new Date(event.eventDate).getTime() - new Date().getTimezoneOffset() * 60000)
                                .toISOString()
                                .slice(0, 16)}
                              onBlur={(e) => {
                                if (!e.target.value) return;
                                updateUpcomingEventRecord(event.id, {
                                  title: event.title,
                                  eventDate: new Date(e.target.value).toISOString(),
                                  slotMinutes: event.slotMinutes,
                                  totalSlotFee: event.totalSlotFee,
                                  notes: event.notes,
                                });
                              }}
                              className="w-full rounded-lg border border-white/10 bg-black/40 px-2 py-1 pr-8 text-xs font-bold text-white outline-none"
                            />
                            <button
                              type="button"
                              onClick={(e) => {
                                const wrapper = e.currentTarget.parentElement;
                                const input = wrapper?.querySelector("input[type='datetime-local']") as HTMLInputElement | null;
                                openNativeDateTimePicker(input);
                              }}
                              className="absolute right-1 top-1/2 -translate-y-1/2 rounded-md p-1 text-emerald-300 hover:bg-emerald-500/15"
                              title="Open calendar"
                              aria-label="Open calendar"
                            >
                              <Calendar size={14} />
                            </button>
                          </div>
                          <input
                            type="number"
                            defaultValue={event.slotMinutes}
                            min={30}
                            onBlur={(e) => {
                              const val = Number(e.target.value);
                              if (Number.isNaN(val)) return;
                              updateUpcomingEventRecord(event.id, {
                                title: event.title,
                                eventDate: event.eventDate,
                                slotMinutes: val,
                                totalSlotFee: event.totalSlotFee,
                                notes: event.notes,
                              });
                            }}
                            className="rounded-lg border border-white/10 bg-black/40 px-2 py-1 text-xs font-bold text-white outline-none"
                          />
                        </div>
                      </div>
                    ))}

                    {selectedDateMatchEvents.map((event, index) => (
                      <div key={`calendar-match-${event._id ?? index}`} className="rounded-xl border border-white/10 bg-black/30 p-3">
                        <p className="mb-2 text-xs font-bold uppercase tracking-[0.12em] text-sky-300">Timeline Event</p>
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="number"
                            min={0}
                            defaultValue={event.minute}
                            onBlur={(e) => {
                              const val = Number(e.target.value);
                              if (!Number.isNaN(val) && val !== event.minute) {
                                updateMatchEventRecord(event, { minute: val });
                              }
                            }}
                            className="rounded-lg border border-white/10 bg-black/40 px-2 py-1 text-xs font-bold text-white outline-none"
                          />
                          <select
                            defaultValue={event.type}
                            onBlur={(e) => {
                              const val = e.target.value as "goal" | "assist" | "foul" | "yellow" | "red";
                              if (val !== event.type) {
                                updateMatchEventRecord(event, { type: val });
                              }
                            }}
                            className="rounded-lg border border-white/10 bg-black/40 px-2 py-1 text-xs font-bold text-white outline-none"
                          >
                            <option value="goal">goal</option>
                            <option value="assist">assist</option>
                            <option value="foul">foul</option>
                            <option value="yellow">yellow</option>
                            <option value="red">red</option>
                          </select>
                          <select
                            defaultValue={event.teamKey}
                            onBlur={(e) => {
                              const val = e.target.value as "A" | "B";
                              if (val !== event.teamKey) {
                                updateMatchEventRecord(event, { teamKey: val });
                              }
                            }}
                            className="rounded-lg border border-white/10 bg-black/40 px-2 py-1 text-xs font-bold text-white outline-none"
                          >
                            <option value="A">Team A</option>
                            <option value="B">Team B</option>
                          </select>
                          <input
                            defaultValue={event.playerName}
                            onBlur={(e) => {
                              if (e.target.value && e.target.value !== event.playerName) {
                                updateMatchEventRecord(event, { playerName: e.target.value });
                              }
                            }}
                            className="rounded-lg border border-white/10 bg-black/40 px-2 py-1 text-xs font-bold text-white outline-none"
                          />
                        </div>
                      </div>
                    ))}

                    {!hasCurrentMatchOnSelectedDate &&
                    selectedDateUpcomingEvents.length === 0 &&
                    selectedDateMatchEvents.length === 0 ? (
                      <p className="rounded-xl border border-white/10 bg-black/30 p-3 text-xs font-bold uppercase tracking-[0.15em] text-white/45">
                        No records for this date.
                      </p>
                    ) : null}
                  </div>
                </div>
              </section>

              <section className="glass-pane rounded-[2rem] p-6 md:p-8 xl:col-span-2">
                <div className="mb-4 flex items-center justify-between gap-2">
                  <h2 className="text-xl font-bold text-white uppercase">Upcoming Event Confirmations & Payments</h2>
                  <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/50">
                    {selectedUpcomingEvent ? selectedUpcomingEvent.title : "Select an event"}
                  </span>
                </div>

                {!selectedUpcomingEvent ? (
                  <p className="rounded-xl border border-white/10 bg-black/25 p-4 text-sm font-bold text-white/60">
                    Create or select an upcoming event to manage confirmations and payment statuses.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {(() => {
                      const participantsWithDefaults = data.members.map((member) =>
                        selectedUpcomingEvent.participants.find((item) => item.memberId === member.id) ||
                        ({ confirmed: false, paymentStatus: "pending", paidAmount: 0 } as UpcomingEventMemberStatus),
                      );

                      const totalPaid = participantsWithDefaults.reduce(
                        (sum, participant) => sum + Number(participant.paidAmount || 0),
                        0,
                      );

                      return (
                        <div className="mb-3 grid gap-3 sm:grid-cols-2">
                          <div className="rounded-xl border border-white/10 bg-black/30 p-3">
                            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/50">Total Slot Fee</p>
                            <p className="mt-1 text-2xl font-black text-white">{selectedUpcomingEvent.totalSlotFee || 0}</p>
                          </div>
                          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3">
                            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-300">Total Paid</p>
                            <p className="mt-1 text-2xl font-black text-emerald-200">{Math.round(totalPaid * 100) / 100}</p>
                          </div>
                        </div>
                      );
                    })()}

                    {data.members.map((member) => {
                      const participant =
                        selectedUpcomingEvent.participants.find((item) => item.memberId === member.id) ||
                        ({ confirmed: false, paymentStatus: "pending", paidAmount: 0 } as UpcomingEventMemberStatus);

                      return (
                        <div key={member.id} className="grid grid-cols-[1.3fr_auto_auto_auto] items-center gap-3 rounded-xl border border-white/10 bg-black/25 p-3">
                          <p className="text-sm font-bold text-white">{member.name}</p>

                          <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-white/70">
                            <input
                              type="checkbox"
                              checked={participant.confirmed}
                              onChange={(e) =>
                                setMemberAttendanceStatus(selectedUpcomingEvent.id, member.id, {
                                  confirmed: e.target.checked,
                                })
                              }
                            />
                            Confirmed
                          </label>

                          <select
                            value={participant.paymentStatus}
                            onChange={(e) =>
                              setMemberAttendanceStatus(selectedUpcomingEvent.id, member.id, {
                                paymentStatus: e.target.value as PaymentStatus,
                              })
                            }
                            className="rounded-lg border border-white/10 bg-black/40 px-2 py-1 text-xs font-bold uppercase tracking-[0.1em] text-white outline-none focus:border-emerald-500/40"
                          >
                            <option value="paid">Paid</option>
                            <option value="unpaid">Unpaid</option>
                            <option value="pending">Pending</option>
                          </select>

                          <input
                            type="number"
                            min={0}
                            step="0.01"
                            value={paidAmountDrafts[`${selectedUpcomingEvent.id}:${member.id}`] ?? String(participant.paidAmount ?? 0)}
                            onChange={(e) => {
                              const key = `${selectedUpcomingEvent.id}:${member.id}`;
                              setPaidAmountDrafts((prev) => ({ ...prev, [key]: e.target.value }));
                            }}
                            onBlur={(e) => {
                              const value = Number(e.target.value);
                              if (Number.isNaN(value)) {
                                const key = `${selectedUpcomingEvent.id}:${member.id}`;
                                setPaidAmountDrafts((prev) => ({ ...prev, [key]: String(participant.paidAmount ?? 0) }));
                                return;
                              }

                              if (value !== Number(participant.paidAmount ?? 0)) {
                                setMemberAttendanceStatus(selectedUpcomingEvent.id, member.id, {
                                  paidAmount: value,
                                });
                              }
                            }}
                            className="w-28 rounded-lg border border-white/10 bg-black/40 px-2 py-1 text-xs font-bold text-white outline-none focus:border-emerald-500/40"
                            placeholder="Paid"
                          />
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            </motion.div>
          )}

          {activeTab === "lineup" && (
            <motion.div
              key="lineup"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid gap-6"
            >
              <section className="glass-pane rounded-[2rem] p-6 md:p-8">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-xl font-bold text-white uppercase">Shared Tactical Drag Board</h3>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2 rounded-full bg-black/40 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-white/60">
                      <MousePointer2 size={12} className="text-emerald-500" />
                      Drag and drop on marked spots
                    </div>
                    <button
                      onClick={saveTacticalSetup}
                      className="flex items-center gap-2 rounded-xl bg-emerald-500/15 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-emerald-300 hover:bg-emerald-500/25"
                    >
                      <Save size={12} /> Save Setup
                    </button>
                  </div>
                </div>

                {Object.keys(pendingPositionChanges).length > 0 ? (
                  <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-amber-300">
                    {Object.keys(pendingPositionChanges).length} unsaved position change(s)
                  </p>
                ) : null}

                <div className="rounded-[2rem] border border-white/10 bg-black/30 p-2">
                  <TacticalCanvas
                    teamA={data.teams[0]}
                    teamB={data.teams[1]}
                    playersPerSide={data.playersPerSide}
                    isEditable={true}
                    onPlayerPositionChange={handlePlayerPositionChange}
                  />
                </div>
              </section>

              <div className="grid gap-6 lg:grid-cols-2">
              {data.teams.map(team => (
                <div key={team.key} className="glass-pane rounded-[2rem] p-8">
                  <div className="mb-8 flex items-center justify-between">
                    <div>
                      <h3 className="text-xl font-bold text-white uppercase">{team.name} Squad</h3>
                      <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mt-1">
                        {team.players.filter(p => p.isStarter).length}/{data.playersPerSide} Starters Selected
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

                        <div className="flex flex-col gap-2">
                           <span className="text-[7px] font-black text-white/20 uppercase tracking-widest px-1">Img URL</span>
                           <input
                            defaultValue={player.imageUrl || ""}
                            onBlur={(e) => {
                              const value = e.target.value.trim();
                              if (value !== (player.imageUrl || "")) {
                                updatePlayerImageUrl(team.key, player.name, value);
                              }
                            }}
                            placeholder="https://..."
                            className="w-32 rounded-lg border border-white/10 bg-black/40 px-2 py-1 text-[10px] text-white outline-none focus:border-emerald-500/40"
                          />
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
              </div>
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

