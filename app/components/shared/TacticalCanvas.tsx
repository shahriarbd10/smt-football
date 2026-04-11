"use client";
import { useRef } from "react";
import { motion, PanInfo } from "framer-motion";

interface Player {
  name: string;
  isStarter: boolean;
  isGoalkeeper: boolean;
  goals: number;
  assists: number;
  position?: { x: number; y: number };
  imageUrl?: string;
}

interface Team {
  name: string;
  key: "A" | "B";
  players: Player[];
}

interface TacticalCanvasProps {
  teamA: Team;
  teamB: Team;
  playersPerSide?: 6 | 7;
  isEditable?: boolean;
  onPlayerPositionChange?: (teamKey: "A" | "B", playerName: string, x: number, y: number) => void;
  variant?: "standard" | "premium";
}

export function TacticalCanvas({ 
  teamA, 
  teamB, 
  playersPerSide = 6, 
  isEditable, 
  onPlayerPositionChange,
  variant = "standard" 
}: TacticalCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const getDefaultPositions = (count: 6 | 7, side: "left" | "right") => {
    const defaultPositionsByFormat: Record<number, Array<[number, number]>> = {
      6: [
        [8, 50],
        [18, 28],
        [18, 72],
        [30, 20],
        [30, 80],
        [42, 50],
      ],
      7: [
        [8, 50],
        [18, 22],
        [18, 78],
        [30, 18],
        [30, 50],
        [30, 82],
        [44, 50],
      ],
    };

    const defaults = defaultPositionsByFormat[count] || defaultPositionsByFormat[6];

    return defaults.map(([x, y]) => ({
      x: side === "right" ? 100 - x : x,
      y,
    }));
  };

  const renderDropTargets = (side: "left" | "right") => {
    const positions = getDefaultPositions(playersPerSide, side);

    return positions.map((position, index) => (
      <div
        key={`${side}-target-${index}`}
        className="pointer-events-none absolute opacity-70"
        style={{
          left: `${position.x}%`,
          top: `${position.y}%`,
          transform: "translate(-50%, -50%)"
        }}
      >
        <div className="flex h-7 w-7 items-center justify-center rounded-full border border-dashed border-white/35 bg-black/15 text-[9px] font-bold text-white/55">
          {index + 1}
        </div>
      </div>
    ));
  };

  const snapToNearestPosition = (
    x: number,
    y: number,
    side: "left" | "right",
    isGoalkeeper: boolean,
  ) => {
    const positions = getDefaultPositions(playersPerSide, side);
    const candidates = isGoalkeeper ? [positions[0]] : positions.slice(1);

    let nearest = candidates[0] || positions[0];
    let nearestDistance = Number.POSITIVE_INFINITY;

    candidates.forEach((position) => {
      const dx = position.x - x;
      const dy = position.y - y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearest = position;
      }
    });

    return nearest;
  };

  const renderPlayers = (team: Team, side: "left" | "right", color: string) => {
    const starters = team.players.filter((p) => p.isStarter).slice(0, playersPerSide);
    const defaultPositions = getDefaultPositions(playersPerSide, side);
    const goalkeeperAnchor = defaultPositions[0];

    const slots = defaultPositions.map((position, index) => ({ position, index }));
    const availableOutfieldSlots = slots.filter((slot) => slot.index !== 0);

    const displayPositionByPlayer = new Map<string, { x: number; y: number }>();

    // Keep goalkeeper fixed on the dedicated GK anchor.
    starters.forEach((player) => {
      if (player.isGoalkeeper) {
        displayPositionByPlayer.set(player.name, goalkeeperAnchor);
      }
    });

    starters.forEach((player) => {
      if (player.isGoalkeeper) return;

      if (availableOutfieldSlots.length === 0) {
        displayPositionByPlayer.set(player.name, defaultPositions[defaultPositions.length - 1]);
        return;
      }

      const preferred = player.position;

      if (!preferred) {
        const fallback = availableOutfieldSlots.shift();
        if (fallback) {
          displayPositionByPlayer.set(player.name, fallback.position);
        }
        return;
      }

      let nearestSlotIndex = 0;
      let nearestDistance = Number.POSITIVE_INFINITY;

      availableOutfieldSlots.forEach((slot, slotIndex) => {
        const distance = Math.hypot(slot.position.x - preferred.x, slot.position.y - preferred.y);
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestSlotIndex = slotIndex;
        }
      });

      const [chosen] = availableOutfieldSlots.splice(nearestSlotIndex, 1);
      if (chosen) {
        displayPositionByPlayer.set(player.name, chosen.position);
      }
    });

    return starters.slice(0, playersPerSide).map((player, index) => {
      let x, y;
      
      const resolved = displayPositionByPlayer.get(player.name);
      if (resolved) {
        x = resolved.x;
        y = resolved.y;
      } else {
        ({ x, y } = defaultPositions[index]);
      }

      const handleDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
        if (!isEditable || !onPlayerPositionChange || player.isGoalkeeper || !containerRef.current) return;

        const rect = containerRef.current.getBoundingClientRect();
        const newX = ((info.point.x - rect.left) / rect.width) * 100;
        const newY = ((info.point.y - rect.top) / rect.height) * 100;

        // Constraint: Keep within respective halves (with padding)
        const clampedX = side === "left" 
          ? Math.min(Math.max(newX, 2), 48) 
          : Math.min(Math.max(newX, 52), 98);
        const clampedY = Math.min(Math.max(newY, 5), 95);

        // Snap drop to nearest tactical marker so every intentional drag produces a saved position change.
        const snapped = snapToNearestPosition(clampedX, clampedY, side, false);

        onPlayerPositionChange(team.key, player.name, snapped.x, snapped.y);
      };

      return (
        <div
          key={`${team.name}-${player.name}`}
          className="absolute -translate-x-1/2 -translate-y-1/2"
          style={{ left: `${x}%`, top: `${y}%`, zIndex: player.isGoalkeeper ? 10 : 20 }}
        >
          <motion.div
            drag={Boolean(isEditable && !player.isGoalkeeper)}
            dragConstraints={containerRef}
            dragMomentum={false}
            onDragEnd={handleDragEnd}
            initial={false}
            animate={{ x: 0, y: 0, scale: 1, opacity: 1 }}
            whileHover={{ scale: 1.08, zIndex: 50 }}
            whileDrag={{ scale: 1.15, zIndex: 60, cursor: "grabbing" }}
            className={`flex touch-none flex-col items-center justify-center gap-1.5 ${
              isEditable && !player.isGoalkeeper ? "cursor-grab" : ""
            }`}
          >
            <div
              className={`relative flex h-14 w-14 items-center justify-center rounded-full border-2 transition-all ${
                variant === "premium" ? "h-16 w-16" : ""
              }`}
              style={{
                backgroundColor: variant === "standard" ? color : "rgba(0,0,0,0.6)",
                borderColor: variant === "standard" ? "rgba(255,255,255,0.5)" : color,
                boxShadow: variant === "standard" 
                  ? `0 0 20px ${color}88` 
                  : `0 0 30px ${color}66, inset 0 0 15px ${color}44`,
              }}
            >
              {variant === "premium" && (
                <motion.div
                  animate={{
                    opacity: [0.3, 0.6, 0.3],
                    scale: [1, 1.05, 1],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                  }}
                  className="absolute inset-0 rounded-full"
                  style={{ border: `2px solid ${color}` }}
                />
              )}

              {player.imageUrl ? (
                <img 
                  src={player.imageUrl} 
                  alt={player.name} 
                  className="h-full w-full rounded-full object-cover"
                />
              ) : (
                <span className="text-sm font-black text-white">
                  {player.name.substring(0, 2).toUpperCase()}
                </span>
              )}
            </div>
            <div className="whitespace-nowrap rounded-md bg-black/80 px-2 py-0.5 text-[9px] font-bold text-white backdrop-blur-md ring-1 ring-white/10 select-none">
              {player.name}
              {player.isGoalkeeper && " (GK)"}
            </div>
            <div className="absolute -right-2 -top-2 flex flex-col gap-1">
              {player.goals > 0 && (
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-black text-white ring-2 ring-black shadow-lg" title="Goals">
                  {player.goals}
                </div>
              )}
              {player.assists > 0 && (
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-500 text-[10px] font-black text-white ring-2 ring-black shadow-lg" title="Assists">
                  {player.assists}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      );
    });
  };

  return (
    <div 
      ref={containerRef}
      className="pitch-container aspect-[3/2] w-full rounded-[2rem] border-white/10 shadow-inner md:aspect-[4/2.5] overflow-hidden"
    >
      <div className="pitch-lines opacity-30" />
      
      {/* Center Line */}
      <div className="absolute left-1/2 top-0 h-full w-px bg-white/20" />
      
      {/* Center Circle */}
      <div className="absolute left-1/2 top-1/2 h-20 w-20 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/20" />
      
      {/* Penalty Areas */}
      <div className="absolute left-0 top-1/4 h-1/2 w-[12%] rounded-r-3xl border-2 border-l-0 border-white/20 bg-white/5" />
      <div className="absolute right-0 top-1/4 h-1/2 w-[12%] rounded-l-3xl border-2 border-r-0 border-white/20 bg-white/5" />

      <div className="relative h-full w-full">
        {isEditable && renderDropTargets("left")}
        {isEditable && renderDropTargets("right")}
        {renderPlayers(teamA, "left", "#10b981")}
        {renderPlayers(teamB, "right", "#f59e0b")}
      </div>
    </div>
  );
}
