"use client";

import { useRef } from "react";
import { motion, PanInfo } from "framer-motion";

export type SpecialFormationPlayer = {
  id: string;
  name: string;
  role: "GK" | "CB" | "CMF" | "CF";
  x: number;
  y: number;
  imageUrl?: string;
};

type SpecialMatchFormationPitchProps = {
  players: SpecialFormationPlayer[];
  editable?: boolean;
  onPlayerMove?: (id: string, x: number, y: number) => void;
};

const roleChipStyle: Record<SpecialFormationPlayer["role"], string> = {
  GK: "bg-sky-500/30 text-sky-200 border-sky-300/30",
  CB: "bg-emerald-500/30 text-emerald-200 border-emerald-300/30",
  CMF: "bg-violet-500/30 text-violet-200 border-violet-300/30",
  CF: "bg-amber-500/30 text-amber-200 border-amber-300/30",
};

export function SpecialMatchFormationPitch({ players, editable, onPlayerMove }: SpecialMatchFormationPitchProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const clampPosition = (x: number, y: number, role: SpecialFormationPlayer["role"]) => {
    const minX = role === "GK" ? 5 : 12;
    const maxX = role === "GK" ? 24 : 95;

    return {
      x: Math.max(minX, Math.min(maxX, x)),
      y: Math.max(8, Math.min(92, y)),
    };
  };

  return (
    <div
      ref={containerRef}
      className="relative aspect-[16/10] w-full overflow-hidden rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.35),transparent_45%),radial-gradient(circle_at_bottom_right,rgba(2,132,199,0.2),transparent_40%),linear-gradient(145deg,rgba(1,36,31,0.95),rgba(2,64,53,0.9))]"
    >
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.06)_1px,transparent_1px)] bg-[size:56px_56px] opacity-20" />
      <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-white/20" />
      <div className="absolute left-1/2 top-1/2 h-28 w-28 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/25" />
      <div className="absolute left-0 top-1/4 h-1/2 w-[13%] rounded-r-3xl border border-l-0 border-white/20" />
      <div className="absolute right-0 top-1/4 h-1/2 w-[13%] rounded-l-3xl border border-r-0 border-white/20" />

      {players.map((player) => (
        <div
          key={player.id}
          className="absolute -translate-x-1/2 -translate-y-1/2"
          style={{ left: `${player.x}%`, top: `${player.y}%`, zIndex: 10 }}
        >
          <motion.div
            drag={Boolean(editable)}
            dragMomentum={false}
            dragConstraints={containerRef}
            whileHover={{ scale: 1.05 }}
            whileDrag={{ scale: 1.08, zIndex: 30 }}
            onDragEnd={(_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
              if (!editable || !onPlayerMove || !containerRef.current) return;

              const rect = containerRef.current.getBoundingClientRect();
              const rawX = ((info.point.x - rect.left) / rect.width) * 100;
              const rawY = ((info.point.y - rect.top) / rect.height) * 100;
              const next = clampPosition(rawX, rawY, player.role);
              onPlayerMove(player.id, next.x, next.y);
            }}
            className={`group flex max-w-[96px] flex-col items-center gap-1 ${editable ? "cursor-grab" : ""}`}
          >
            <div className="relative h-12 w-12 overflow-hidden rounded-full border-2 border-white/40 bg-black/35 shadow-[0_0_20px_rgba(16,185,129,0.35)]">
              {player.imageUrl ? (
                <img src={player.imageUrl} alt={player.name} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-[10px] font-black text-white">
                  {player.name.slice(0, 2).toUpperCase()}
                </div>
              )}
            </div>
            <span className={`rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] ${roleChipStyle[player.role]}`}>
              {player.role}
            </span>
            <span className="rounded-md bg-black/75 px-2 py-0.5 text-[9px] font-bold text-white">
              {player.name}
            </span>
          </motion.div>
        </div>
      ))}
    </div>
  );
}
