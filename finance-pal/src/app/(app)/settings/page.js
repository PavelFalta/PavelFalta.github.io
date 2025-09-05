"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

function useAuthFetch() {
  return async (path, opts = {}) => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    const base = "https://finance-backend-production-f25f.up.railway.app";
    const res = await fetch(base + path, {
      ...opts,
      headers: {
        "Content-Type": "application/json",
        Authorization: token ? `Bearer ${token}` : undefined,
        ...(opts.headers || {}),
      },
    });
    if (res.status === 401) {
      if (typeof window !== "undefined") window.location.href = "/login";
      return Promise.reject(new Error("Unauthorized"));
    }
    return res;
  };
}

export default function SettingsPage() {
  const authFetch = useAuthFetch();
  const router = useRouter();
  const [currency, setCurrency] = useState("CZK");
  const [paycheckDay, setPaycheckDay] = useState(1);
  const [email, setEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await authFetch("/settings");
        const data = await res.json();
        setCurrency(data.currency);
        setPaycheckDay(data.paycheck_day);
        const meRes = await authFetch("/auth/me");
        const me = await meRes.json();
        setEmail(me.email);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function saveSettings(e) {
    e.preventDefault();
    setError("");
    setMessage("");
    try {
      const res = await authFetch("/settings", { method: "PUT", body: JSON.stringify({ currency, paycheck_day: Number(paycheckDay) }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.detail || "Failed to save settings");
      localStorage.setItem("toast", "Settings updated");
      router.replace("/dashboard");
    } catch (e) {
      setError(e.message);
    }
  }

  async function saveProfile(e) {
    e.preventDefault();
    setError("");
    setMessage("");
    try {
      const res = await authFetch("/auth/me", { method: "PUT", body: JSON.stringify({ email, current_password: currentPassword || undefined, new_password: newPassword || undefined }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.detail || "Failed to save profile");
      localStorage.setItem("toast", "Profile updated");
      router.replace("/dashboard");
      setCurrentPassword("");
      setNewPassword("");
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <div className="min-h-screen p-6">
      <header className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-medium">Settings</h1>
        <nav className="flex items-center gap-2 text-sm">
          <Link href="/dashboard" className="h-9 px-3 rounded-md border border-white/15 backdrop-blur supports-[backdrop-filter]:bg-white/5 text-white hover:ring-1 hover:ring-white/30 transition flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="opacity-80"><path d="M15 3H6a2 2 0 0 0-2 2v14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><path d="M9 7h9a2 2 0 0 1 2 2v12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
            <span className="hidden sm:inline">Dashboard</span>
          </Link>
          <button onClick={() => { localStorage.removeItem("token"); window.location.href = "/login"; }} className="h-9 px-3 rounded-md border border-white/15 backdrop-blur supports-[backdrop-filter]:bg-white/5 text-white hover:ring-1 hover:ring-white/30 transition flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="opacity-80"><path d="M15 17l5-5-5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M20 12H9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M12 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            <span className="hidden sm:inline">Logout</span>
          </button>
        </nav>
      </header>

      {message && <p className="text-sm text-emerald-500 mb-4">{message}</p>}
      {error && <p className="text-sm text-red-500 mb-4">{error}</p>}

      <div className="grid gap-6 md:grid-cols-2">
        {loading ? (
          <>
            <div className="relative rounded-xl border border-black/10 dark:border-white/15 p-5 overflow-hidden">
              <div className="absolute left-0 right-0 top-0 h-0.5 overflow-hidden">
                <div className="h-full w-[40%] bg-gradient-to-r from-[#22d3ee] to-[#8b5cf6] animate-[loading_1.2s_ease-in-out_infinite]"></div>
                <style jsx>{`
                  @keyframes loading {
                    0% { transform: translateX(-100%); }
                    50% { transform: translateX(60%); }
                    100% { transform: translateX(200%); }
                  }
                `}</style>
              </div>
              <div className="h-4 w-24 rounded bg-white/10 mb-4" />
              <div className="h-4 w-16 rounded bg-white/10 mb-2" />
              <div className="h-11 w-full rounded-md bg-white/10 mb-3" />
              <div className="h-4 w-36 rounded bg-white/10 mb-2" />
              <div className="h-11 w-full rounded-md bg-white/10 mb-4" />
              <div className="h-10 w-24 rounded-md bg-white/10 ml-auto" />
            </div>
            <div className="relative rounded-xl border border-black/10 dark:border-white/15 p-5 overflow-hidden">
              <div className="absolute left-0 right-0 top-0 h-0.5 overflow-hidden">
                <div className="h-full w-[40%] bg-gradient-to-r from-[#22d3ee] to-[#8b5cf6] animate-[loading_1.2s_ease-in-out_infinite]"></div>
              </div>
              <div className="h-4 w-20 rounded bg-white/10 mb-4" />
              <div className="h-4 w-16 rounded bg-white/10 mb-2" />
              <div className="h-11 w-full rounded-md bg-white/10 mb-3" />
              <div className="grid md:grid-cols-2 gap-3">
                <div className="h-11 w-full rounded-md bg-white/10" />
                <div className="h-11 w-full rounded-md bg-white/10" />
              </div>
              <div className="h-10 w-28 rounded-md bg-white/10 ml-auto mt-4" />
            </div>
          </>
        ) : (
          <>
            {/* General */}
            <form onSubmit={saveSettings} className="relative rounded-xl border border-black/10 dark:border-white/15 p-5 space-y-4 backdrop-blur supports-[backdrop-filter]:bg-white/5 dark:supports-[backdrop-filter]:bg-black/20">
              <div className="flex items-center justify-between">
                <h2 className="text-sm">General</h2>
              </div>
              <div>
                <label className="block text-sm mb-1">Currency</label>
                <div className="relative">
                  <input value={currency} onChange={(e) => setCurrency(e.target.value)} className="w-full h-11 rounded-md border border-white/15 bg-transparent pl-3 pr-10 text-white" />
                  <span className="absolute inset-y-0 right-2 grid place-items-center text-white/60 text-xs pointer-events-none">ISO</span>
                </div>
              </div>
              <div>
                <label className="block text-sm mb-1">Paycheck day (1-28)</label>
                <input type="number" min="1" max="28" value={paycheckDay} onChange={(e) => setPaycheckDay(e.target.value)} className="w-full h-11 rounded-md border border-white/15 bg-transparent px-3 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
              </div>
              <div className="flex justify-end">
                <button type="submit" className="h-10 px-4 rounded-md bg-[radial-gradient(circle_at_50%_0%,_#22d3ee,_#06b6d4)] text-white">Save</button>
              </div>
            </form>

            {/* Profile */}
            <form onSubmit={saveProfile} className="relative rounded-xl border border-black/10 dark:border-white/15 p-5 space-y-4 backdrop-blur supports-[backdrop-filter]:bg-white/5 dark:supports-[backdrop-filter]:bg-black/20">
              <div className="flex items-center justify-between">
                <h2 className="text-sm">Profile</h2>
              </div>
              <div>
                <label className="block text-sm mb-1">Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full h-11 rounded-md border border-white/15 bg-transparent px-3" />
              </div>
              <div className="grid md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm mb-1">Current password</label>
                  <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="w-full h-11 rounded-md border border-white/15 bg-transparent px-3" />
                </div>
                <div>
                  <label className="block text-sm mb-1">New password</label>
                  <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full h-11 rounded-md border border-white/15 bg-transparent px-3" />
                </div>
              </div>
              <div className="flex justify-end">
                <button type="submit" className="h-10 px-4 rounded-md border border-white/15">Save profile</button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}



