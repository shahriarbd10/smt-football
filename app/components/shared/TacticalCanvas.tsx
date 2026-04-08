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
}

interface Team {
  name: string;
  key: "A" | "B";
  players: Player[];
}

interface TacticalCanvasProps {
  teamA: Team;
  teamB: Team;
  isEditable?: boolean;
  onPlayerPositionChange?: (teamKey: "A" | "B", playerName: string, x: number, y: number) => void;
}

export function TacticalCanvas({ teamA, teamB, isEditable, onPlayerPositionChange }: TacticalCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const renderPlayers = (team: Team, side: "left" | "right", color: string) => {
    const starters = team.players.filter((p) => p.isStarter);
    
    // Default formation logic [x, y]
    const defaultPositions = [
      [8, 50],  // GK
      [18, 28], // DEF Top
      [18, 72], // DEF Bottom
      [30, 20], // MID Top
      [30, 80], // MID Bottom
      [42, 50], // FWD
    ];

    return starters.slice(0, 6).map((player, index) => {
      let x, y;
      
      if (player.position) {
        x = player.position.x;
        y = player.position.y;
      } else {
        [x, y] = defaultPositions[index];
        if (side === "right") {
          x = 100 - x;
        }
      }

      const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
        if (!isEditable || !onPlayerPositionChange || player.isGoalkeeper || !containerRef.current) return;

        const rect = containerRef.current.getBoundingClientRect();
        const newX = ((info.point.x - rect.left) / rect.width) * 100;
        const newY = ((info.point.y - rect.top) / rect.height) * 100;

        // Constraint: Keep within respective halves (with padding)
        const clampedX = side === "left" 
          ? Math.min(Math.max(newX, 2), 48) 
          : Math.min(Math.max(newX, 52), 98);
        const clampedY = Math.min(Math.max(newY, 5), 95);

        onPlayerPositionChange(team.key, player.name, clampedX, clampedY);
      };

      return (
        <motion.div
          key={`${team.name}-${player.name}`}
          drag={isEditable && !player.isGoalkeeper}
          dragConstraints={containerRef}
          dragMomentum={false}
          onDragEnd={handleDragEnd}
          initial={false}
          animate={{ x: 0, y: 0, scale: 1, opacity: 1 }}
          whileHover={{ scale: 1.1, zIndex: 50 }}
          whileDrag={{ scale: 1.2, zIndex: 60, cursor: "grabbing" }}
          className={`absolute flex flex-col items-center justify-center gap-1.5 ${isEditable && !player.isGoalkeeper ? "cursor-grab" : ""}`}
          style={{ 
            left: `${x}%`, 
            top: `${y}%`,
            transform: "translate(-50%, -50%)",
            zIndex: player.isGoalkeeper ? 10 : 20 
          }}
        >
          <div 
            className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-white/50 text-[10px] font-bold shadow-2xl transition-transform"
            style={{ 
              backgroundColor: color,
              color: "#fff",
              boxShadow: `0 0 20px ${color}88`
            }}
          >
            {player.name.substring(0, 2).toUpperCase()}
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
        {renderPlayers(teamA, "left", "#10b981")}
        {renderPlayers(teamB, "right", "#f59e0b")}
      </div>
    </div>
  );
}
