"use client";

import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface MatchStatCardProps {
  label: string;
  value: number | string;
  icon: LucideIcon;
  color?: "emerald" | "amber" | "rose" | "sky";
  className?: string;
}

export function MatchStatCard({
  label,
  value,
  icon: Icon,
  color = "emerald",
  className,
}: MatchStatCardProps) {
  const colorMap = {
    emerald: "text-emerald-400 border-emerald-500/20 bg-emerald-500/5",
    amber: "text-amber-400 border-amber-500/20 bg-amber-500/5",
    rose: "text-rose-400 border-rose-500/20 bg-rose-500/5",
    sky: "text-sky-400 border-sky-500/20 bg-sky-500/5",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "flex items-center gap-4 rounded-2xl border p-4 glass-pane",
        colorMap[color],
        className
      )}
    >
      <div className={cn("rounded-xl p-2.5 bg-black/20")}>
        <Icon size={20} />
      </div>
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-white/50">
          {label}
        </p>
        <p className="text-2xl font-bold leading-tight">{value}</p>
      </div>
    </motion.div>
  );
}
