"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ShieldCheck, 
  Lock, 
  Mail, 
  ArrowRight, 
  Trophy, 
  AlertCircle,
  Loader2
} from "lucide-react";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        throw new Error("Invalid admin credentials");
      }

      router.push("/admin");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connection failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4 bg-[#020a08]">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-emerald-500/10 blur-[120px] rounded-full" />
        <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-amber-500/10 blur-[120px] rounded-full" />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="glass-pane w-full max-w-md rounded-[2.5rem] p-10 md:p-12 relative z-10"
      >
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-emerald-500/10 text-emerald-500 shadow-[0_0_30px_rgba(16,185,129,0.2)]">
            <Trophy size={40} />
          </div>
          <p className="text-[10px] font-bold tracking-[0.4em] text-emerald-400 uppercase mb-2">Authenticated HQ</p>
          <h1 className="text-4xl font-bold text-white leading-tight">Match Control</h1>
          <p className="mt-2 text-sm text-white/40">Secure access for tournament administrators</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={20} />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-2xl border border-white/5 bg-black/40 pl-12 pr-6 py-4 text-white outline-none focus:border-emerald-500/50 transition-all placeholder:text-white/20"
              placeholder="Admin Email"
            />
          </div>

          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={20} />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded-2xl border border-white/5 bg-black/40 pl-12 pr-6 py-4 text-white outline-none focus:border-emerald-500/50 transition-all placeholder:text-white/20"
              placeholder="Password"
            />
          </div>

          <button 
            disabled={loading}
            className="group relative w-full overflow-hidden rounded-2xl bg-emerald-500 px-6 py-4 font-bold text-black transition-all hover:bg-emerald-400 active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100"
          >
            <div className="flex items-center justify-center gap-2">
              {loading ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <>
                  Enter Dashboard
                  <ArrowRight size={20} className="transition-transform group-hover:translate-x-1" />
                </>
              )}
            </div>
          </button>
        </form>

        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-6 flex items-center gap-2 rounded-xl bg-rose-500/10 p-4 text-sm font-medium text-rose-400 border border-rose-500/20"
            >
              <AlertCircle size={18} />
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mt-8 flex items-center justify-center gap-2 text-white/20">
          <ShieldCheck size={14} />
          <span className="text-[10px] uppercase font-bold tracking-widest">End-to-End SSL Secure</span>
        </div>
      </motion.div>
    </main>
  );
}
