"use client";

import { useEffect, useMemo, useRef, useState, useId, useCallback } from "react";
import { useKeenSlider } from "keen-slider/react";
import "keen-slider/keen-slider.min.css";
import Link from "next/link";

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

export default function DashboardPage() {
  const authFetch = useAuthFetch();
  const [summary, setSummary] = useState(null);
  const [spendings, setSpendings] = useState([]);
  const [categories, setCategories] = useState([]);
  const [paycheckDay, setPaycheckDay] = useState(1);
  const [viewYear, setViewYear] = useState(new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(new Date().getMonth() + 1);
  const [goalAmount, setGoalAmount] = useState("");
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [anim, setAnim] = useState(1);
  const [toast, setToast] = useState("");
  const listRef = useRef(null);
  const [filterDay, setFilterDay] = useState(null); // YYYY-MM-DD or null
  const [loading, setLoading] = useState(false);
  const [editingGoal, setEditingGoal] = useState(false);
  const [hoverKey, setHoverKey] = useState(null); // YYYY-MM-DD for synchronized tooltips

  useEffect(() => {
    let active = true;
    setLoading(true);
    (async () => {
      try {
        const qp = `?year=${viewYear}&month=${viewMonth}`;
        // Also fetch next month spendings so we can build pay periods that span months
        const nextDate = new Date(viewYear, viewMonth - 1 + 1, 1);
        const qpNext = `?year=${nextDate.getFullYear()}&month=${nextDate.getMonth() + 1}`;
        const [sumRes, spRes, spNextRes, catRes] = await Promise.all([
          authFetch(`/dashboard${qp}`),
          authFetch(`/spendings${qp}`),
          authFetch(`/spendings${qpNext}`),
          authFetch("/categories"),
        ]);
        // Optimistically clear previous data to avoid visual flash from old month
        setSummary(null);
        setSpendings([]);
        const [sum, sp, spNext, cat] = await Promise.all([sumRes.json(), spRes.json(), spNextRes.json(), catRes.json()]);
        if (!active) return;
        setSummary(sum);
        setSpendings([...(Array.isArray(sp) ? sp : []), ...(Array.isArray(spNext) ? spNext : [])]);
        setCategories(cat);
      } catch (e) {
        if (!active) return;
        setError(e.message);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [viewYear, viewMonth]);

  // Load paycheck day from settings (used to align charts to pay period)
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await authFetch("/settings");
        const data = await res.json();
        if (!active) return;
        if (data && typeof data.paycheck_day === "number") setPaycheckDay(data.paycheck_day || 1);
      } catch {}
    })();
    return () => { active = false; };
  }, []);

  // toast from settings
  useEffect(() => {
    const t = localStorage.getItem("toast");
    if (t) {
      setToast(t);
      localStorage.removeItem("toast");
      const id = setTimeout(() => setToast(""), 3000);
      return () => clearTimeout(id);
    }
  }, []);

  // animate numbers to target
  useEffect(() => {
    if (!summary) return;
    let raf;
    const start = performance.now();
    const duration = 800;
    function frame(t) {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setAnim(eased);
      if (p < 1) raf = requestAnimationFrame(frame);
    }
    setAnim(0);
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [summary?.month_spent, summary?.month_goal, summary?.daily_budget]);

  const isCurrentMonth = useMemo(() => {
    const now = new Date();
    return viewYear === now.getFullYear() && viewMonth === (now.getMonth() + 1);
  }, [viewYear, viewMonth]);

  const displayedSpent = summary ? summary.month_spent * anim : 0;
  // Pay-period helpers for projection and daily allowance
  const periodStart = useMemo(() => computePeriodStart(viewYear, viewMonth, paycheckDay), [viewYear, viewMonth, paycheckDay]);
  const periodDays = useMemo(() => computePeriodDays(viewYear, viewMonth, paycheckDay), [viewYear, viewMonth, paycheckDay]);
  const periodEnd = useMemo(() => computePeriodEnd(viewYear, viewMonth, paycheckDay), [viewYear, viewMonth, paycheckDay]);
  const isCurrentPeriod = useMemo(() => {
    const now = new Date();
    return now >= periodStart && now < periodEnd;
  }, [periodStart, periodEnd]);
  const periodSpendings = useMemo(() => filterSpendingsByPayPeriod(spendings, viewYear, viewMonth, paycheckDay), [spendings, viewYear, viewMonth, paycheckDay]);
  const periodSpentTotal = useMemo(() => periodSpendings.reduce((a, s) => a + s.amount, 0), [periodSpendings]);
  const periodSpentToDate = useMemo(() => {
    if (!isCurrentPeriod) return 0;
    const now = new Date();
    return periodSpendings.filter((s) => new Date(s.spent_at) < now).reduce((a, s) => a + s.amount, 0);
  }, [periodSpendings, isCurrentPeriod]);
  const displayedDaily = useMemo(() => {
    if (!summary?.month_goal || !isCurrentPeriod) return null;
    const now = new Date();
    const MS = 24*60*60*1000;
    const startMid = new Date(periodStart.getFullYear(), periodStart.getMonth(), periodStart.getDate());
    const todayMid = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const elapsed = Math.max(0, Math.min(periodDays, Math.floor((todayMid - startMid) / MS) + 1));
    const remaining = Math.max(0, periodDays - elapsed);
    if (remaining <= 0) return 0;
    const remainingBudget = Math.max(0, summary.month_goal - periodSpentToDate);
    return (remainingBudget / remaining) * anim;
  }, [summary?.month_goal, isCurrentPeriod, periodStart, periodDays, periodSpentToDate, anim]);
  const goalProgress = useMemo(() => {
    if (!summary || !summary.month_goal) return 0;
    const pct = Math.min(100, Math.round((displayedSpent / summary.month_goal) * 100));
    return pct;
  }, [summary, displayedSpent]);

  // simple color mix between cyan and purple based on progress
  function mixColor(c1, c2, t) {
    const a = parseInt(c1.slice(1), 16);
    const b = parseInt(c2.slice(1), 16);
    const ar = (a >> 16) & 255, ag = (a >> 8) & 255, ab = a & 255;
    const br = (b >> 16) & 255, bg = (b >> 8) & 255, bb = b & 255;
    const r = Math.round(ar + (br - ar) * t);
    const g = Math.round(ag + (bg - ag) * t);
    const bl = Math.round(ab + (bb - ab) * t);
    return `rgb(${r}, ${g}, ${bl})`;
  }

  const projectedPercent = useMemo(() => {
    if (!summary || !summary.month_goal) return null;
    if (!isCurrentPeriod) return null;
    const now = new Date();
    const MS = 24*60*60*1000;
    const startMid = new Date(periodStart.getFullYear(), periodStart.getMonth(), periodStart.getDate());
    const todayMid = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const elapsed = Math.max(0, Math.min(periodDays, Math.floor((todayMid - startMid) / MS) + 1));
    const remaining = Math.max(0, periodDays - elapsed);
    const avgSoFar = elapsed > 0 ? (periodSpentToDate / elapsed) : 0;
    const projectedTotal = periodSpentToDate + avgSoFar * remaining;
    const pctRaw = Math.round((projectedTotal / summary.month_goal) * 100);
    const pct = Math.max(0, Math.min(100, pctRaw));
    return { projectedTotal, pct, pctRaw };
  }, [summary, isCurrentPeriod, periodStart, periodDays, periodSpentToDate]);

  const idealByTodayPct = useMemo(() => {
    if (!summary?.month_goal) return null;
    if (!isCurrentPeriod) return null;
    const now = new Date();
    const MS = 24*60*60*1000;
    const startMid = new Date(periodStart.getFullYear(), periodStart.getMonth(), periodStart.getDate());
    const todayMid = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const elapsed = Math.max(0, Math.min(periodDays, Math.floor((todayMid - startMid) / MS) + 1));
    const idealSoFar = summary.month_goal * (elapsed / periodDays);
    const pct = Math.max(0, Math.min(100, Math.round((idealSoFar / summary.month_goal) * 100)));
    return pct;
  }, [summary?.month_goal, isCurrentPeriod, periodStart, periodDays]);

  const periodProgress = useMemo(() => {
    if (!isCurrentPeriod) return null;
    const now = new Date();
    const MS = 24*60*60*1000;
    const startMid = new Date(periodStart.getFullYear(), periodStart.getMonth(), periodStart.getDate());
    const todayMid = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const elapsed = Math.max(0, Math.min(periodDays, Math.floor((todayMid - startMid) / MS) + 1));
    const remaining = Math.max(0, periodDays - elapsed);
    const remainingPct = 100 - (remaining / periodDays) * 100;
    return { remaining, remainingPct };
  }, [isCurrentPeriod, periodStart, periodDays]);

  async function onSpendingCreated(data) {
    setSpendings((s) => [data, ...s]);
    const sRes = await authFetch(`/dashboard?year=${viewYear}&month=${viewMonth}`);
    setSummary(await sRes.json());
  }

  function addLocalCategory(cat) {
    setCategories((c) => [...c, cat]);
  }

  function openEditSpending(s) {
    setEditing(s);
  }

  async function deleteSpending(id) {
    setDeleting(id);
  }

  function replaceSpending(updated) {
    setSpendings((arr) => arr.map((x) => (x.id === updated.id ? updated : x)));
  }

  async function onDeleted(id) {
    try {
      const res = await authFetch(`/spendings/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      setSpendings((arr) => arr.filter((x) => x.id !== id));
      const sRes = await authFetch(`/dashboard?year=${viewYear}&month=${viewMonth}`);
      setSummary(await sRes.json());
    } catch (e) {
      setError(e.message);
    }
  }

  function scrollToDay(day) {
    setFilterDay(day);
    setTimeout(() => {
      const el = document.querySelector(`[data-day='${day}']`);
      if (el && listRef.current) {
        listRef.current.scrollTo({ top: el.offsetTop - 12, behavior: "smooth" });
      }
    }, 50);
  }

  function shiftMonth(delta) {
    const d = new Date(viewYear, viewMonth - 1 + delta, 1);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth() + 1);
  }

  async function saveGoalAmount(amount) {
    setError("");
    try {
      const res = await authFetch("/goals", { method: "POST", body: JSON.stringify({ year: viewYear, month: viewMonth, amount: Number(amount), currency: summary?.currency || "CZK" }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.detail || "Failed to save goal");
      const sRes = await authFetch(`/dashboard?year=${viewYear}&month=${viewMonth}`);
      setSummary(await sRes.json());
      setGoalAmount("");
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <div className="min-h-screen p-6">
      <header className="mb-6">
        <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-3">
          <div className="min-w-0">
            <h1 className="text-2xl font-medium">Dashboard</h1>
          </div>
          <div className="w-auto shrink-0">
            <div className="hidden md:flex items-center justify-center">
              <MonthPickerInline
                year={viewYear}
                month={viewMonth}
                onChange={(y, m) => {
                  setViewYear(y);
                  setViewMonth(m);
                  setFilterDay(null);
                }}
              />
            </div>
            <div className="md:hidden">
              <MonthPickerVertical
                year={viewYear}
                month={viewMonth}
                onChange={(y, m) => {
                  setViewYear(y);
                  setViewMonth(m);
                  setFilterDay(null);
                }}
              />
            </div>
          </div>
          <nav className="flex items-center gap-2 text-sm">
            <Link href="/settings" className="h-9 px-3 rounded-md border border-white/15 backdrop-blur supports-[backdrop-filter]:bg-white/5 text-white hover:ring-1 hover:ring-white/30 transition flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="opacity-80"><path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" stroke="currentColor" strokeWidth="1.5"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06A1.65 1.65 0 0 0 15 19.4a1.65 1.65 0 0 0-1 .6 1.65 1.65 0 0 0-.35 1.04V21a2 2 0 1 1-4 0v-.06a1.65 1.65 0 0 0-.6-1 1.65 1.65 0 0 0-1.04-.35H8.6a1.65 1.65 0 0 0-1.82-.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-.6-1 1.65 1.65 0 0 0-1.04-.35H3a2 2 0 1 1 0-4h.06c.39 0 .77-.12 1.04-.35.29-.26.49-.62.6-1 0 0 0-.01 0-.01A1.65 1.65 0 0 0 4.6 8a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06c.5.5 1.2.66 1.82.33.36-.18.72-.38 1-.6.23-.27.35-.65.35-1.04V3a2 2 0 1 1 4 0v.06c0 .39.12.77.35 1.04.29.22.64.42 1 .6.63.33 1.33.17 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9c.39.18.77.38 1 .6.27.23.6.35.99.35H21a2 2 0 1 1 0 4h-.06c-.39 0-.72.12-.99.35-.23.2-.43.6-.55 1Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              <span className="hidden sm:inline">Settings</span>
            </Link>
            <button onClick={() => { localStorage.removeItem("token"); window.location.href = "/finance-pal/login"; }} className="h-9 px-3 rounded-md border border-white/15 backdrop-blur supports-[backdrop-filter]:bg-white/5 text-white hover:ring-1 hover:ring-white/30 transition flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="opacity-80"><path d="M15 17l5-5-5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M20 12H9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M12 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              <span className="hidden sm:inline">Logout</span>
            </button>
          </nav>
        </div>
      </header>

      {error && <p className="text-sm text-red-500 mb-4">{error}</p>}

      {summary && (
        <section className="grid gap-6 md:grid-cols-2 mb-8">
          <div className="rounded-xl border border-black/10 dark:border-white/15 p-5 backdrop-blur supports-[backdrop-filter]:bg-white/5 dark:supports-[backdrop-filter]:bg-black/20 relative overflow-hidden">
            {loading && <LoadingBar />}
            <div className="mb-2 flex items-center justify-between gap-3">
              <h2 className="text-sm">Monthly goal progress</h2>
              <div className="text-xs text-black/60 dark:text-white/60 whitespace-nowrap">
                {displayedSpent.toFixed(2)} / {summary.month_goal ? summary.month_goal.toFixed(2) : "—"} {summary.currency}
              </div>
            </div>
            {loading ? (
              <>
                <div className="h-3 w-full rounded-full bg-white/10 animate-pulse" />
                <div className="mt-2 h-4 w-40 rounded bg-white/10 animate-pulse" />
                <div className="mt-3 flex items-end justify-between gap-3">
                  <div className="h-4 w-48 rounded bg-white/10 animate-pulse" />
                  <div className="h-9 w-56 rounded bg-white/10 animate-pulse" />
                </div>
              </>
            ) : (
              <>
                <div className="relative">
                  <div className="mb-6 h-3 w-full rounded-full overflow-hidden relative border border-black/10 dark:border-white/15" style={{ background: "rgba(0,0,0,0.05)" }}>
                    {(!isCurrentMonth && goalProgress > 0 && goalProgress < 100) && (
                      <div className="absolute inset-0 bg-green-500/25" />
                    )}
                    <div className="relative h-full" style={{ width: `${goalProgress}%`, backgroundColor: mixColor("#22d3ee", "#8b5cf6", Math.min(1, goalProgress/100)) }} />
                  </div>
                  {/* Indicators overlay (not clipped) */}
                  {(() => {
                    const p1 = projectedPercent ? projectedPercent.pct * anim : null;
                    const p2 = idealByTodayPct != null ? idealByTodayPct * anim : null;
                    const { left1, left2, v1, v2 } = computeLabelLayout(p1, p2);
                    return (
                      <>
                        {projectedPercent && (
                          <div className="pointer-events-none absolute inset-x-0 top-0 h-0">
                            {projectedPercent.pctRaw > 100 ? (
                              <div className="absolute top-4 right-0 text-[11px] px-1.5 py-0 rounded-sm bg-[#a78bfa]/20 text-[#a78bfa] border border-[#a78bfa]/40 whitespace-nowrap flex items-center gap-0.5">
                                <span>{projectedPercent.pctRaw}%</span>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                                  <path d="M7 17L17 7M9 7h8v8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                              </div>
                            ) : (
                              <>
                                <div className="absolute -top-3 h-6 w-0.5 bg-[#a78bfa]" style={{ left: `${projectedPercent.pct * anim}%` }} />
                                <div className={`absolute ${v1} text-[11px] px-1.5 py-0 rounded-sm bg-[#a78bfa]/20 text-[#a78bfa] border border-[#a78bfa]/40 whitespace-nowrap ${tooltipAlignClass(left1)}`} style={{ left: `${left1}%` }}>
                                  Projected
                                </div>
                              </>
                            )}
                          </div>
                        )}
                        {idealByTodayPct != null && periodProgress && (
                          <div className="pointer-events-none absolute inset-x-0 top-0 h-0">
                            <div className="absolute -top-3 h-6 w-0.5 bg-[#22d3ee]" style={{ left: `${idealByTodayPct * anim}%` }} />
                            <div className={`absolute ${v2} text-[11px] px-1.5 py-0 rounded-sm bg-[#22d3ee]/20 text-[#22d3ee] border border-[#22d3ee]/40 whitespace-nowrap ${tooltipAlignClass(left2)}`} style={{ left: `${left2}%` }}>
                              {`${periodProgress.remaining} days to go (${periodProgress.remainingPct.toFixed(1)}%)`}
                            </div>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
                {/* moved amount text into the header row above to free space for labels */}
                <div className="mt-3 flex items-end justify-between gap-3 mt-10">
                  <div className="text-sm text-black/60 dark:text-white/60">
                    {projectedPercent ? (
                      <>Projected: <span className="text-black dark:text-white">{(projectedPercent.projectedTotal * anim).toFixed(2)} {summary.currency}</span></>
                    ) : (
                      <span className="opacity-70">{!isCurrentPeriod ? 'Projection available for current period only' : 'Set a goal to see projection and daily allowance'}</span>
                    )}
                  </div>
                  {/* Goal quick-edit overlay (absolute, expands left, doesn't shift layout) */}
                  <div className="absolute bottom-2 right-2 z-10">
                    {!editingGoal ? (
                      <div className="relative">
                        {isCurrentPeriod && !summary?.month_goal && (
                          <span className="pointer-events-none absolute -inset-1 rounded-md animate-ping bg-[#22d3ee]/30" />
                        )}
                        <button
                          aria-label="Edit goal"
                          onClick={() => { setEditingGoal(true); setGoalAmount(String(summary?.month_goal ?? '')); }}
                          className="relative h-9 w-9 rounded-md border border-white/20 backdrop-blur supports-[backdrop-filter]:bg-white/5 text-white hover:ring-1 hover:ring-white/30 transition"
                          title={!summary?.month_goal ? 'Set a goal' : 'Edit goal'}
                        >
                          {/* Pencil (edit) icon */}
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="mx-auto">
                            <path d="M3 17.25V21h3.75L19.81 7.94l-3.75-3.75L3 17.25Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </button>
                      </div>
                    ) : (
                      <div className="relative">
                        <input
                        type="number"
                        step="0.01"
                        autoFocus
                        value={goalAmount}
                        onChange={(e) => setGoalAmount(e.target.value)}
                        onBlur={() => { setEditingGoal(false); if (goalAmount) saveGoalAmount(goalAmount); }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') { e.currentTarget.blur(); }
                          if (e.key === 'Escape') { setEditingGoal(false); }
                        }}
                        placeholder="Amount"
                        className="h-9 w-40 rounded-md border border-white/15 bg-black/30 pl-3 pr-10 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none text-white text-sm"
                      />
                        <span className="absolute inset-y-0 right-2 grid place-items-center text-white/70 text-xs pointer-events-none">{summary?.currency || 'CZK'}</span>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
          <div className="rounded-xl border border-black/10 dark:border-white/15 p-5 backdrop-blur supports-[backdrop-filter]:bg-white/5 dark:supports-[backdrop-filter]:bg-black/20 relative overflow-hidden">
            {loading && <LoadingBar />}
            <h2 className="text-sm mb-2">Today&apos;s allowance</h2>
            {loading ? (
              <>
                <div className="h-8 w-40 rounded bg-white/10 animate-pulse" />
                <div className="mt-2 h-4 w-48 rounded bg-white/10 animate-pulse" />
              </>
            ) : (
              <>
                <p className="text-4xl font-semibold tracking-tight">
                  {displayedDaily != null ? `${displayedDaily.toFixed(2)} ${summary.currency}` : "—"}
                </p>
                <p className="text-sm text-black/60 dark:text-white/60">
                  {isCurrentPeriod
                    ? (summary?.month_goal ? `${Math.max(0, periodDays - Math.max(0, Math.min(periodDays, Math.floor((new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()) - new Date(periodStart.getFullYear(), periodStart.getMonth(), periodStart.getDate()))/(24*60*60*1000)) + 1)))} day(s) remaining` : 'Set a goal to see today\'s allowance')
                    : 'Only for current period'}
                </p>
              </>
            )}
          </div>
          <div className="rounded-xl border border-black/10 dark:border-white/15 p-5 backdrop-blur supports-[backdrop-filter]:bg-white/5 dark:supports-[backdrop-filter]:bg-black/20 relative overflow-hidden">
            {loading && <LoadingBar />}
            <h2 className="text-sm mb-2">Spend by category</h2>
            {loading ? (
              <div className="flex items-center gap-4">
                <div className="w-[200px] h-[200px] rounded-full bg-white/10 animate-pulse" />
                <div className="space-y-2">
                  <div className="h-4 w-40 rounded bg-white/10 animate-pulse" />
                  <div className="h-4 w-44 rounded bg-white/10 animate-pulse" />
                  <div className="h-4 w-36 rounded bg-white/10 animate-pulse" />
                </div>
              </div>
            ) : (
              <DonutChart
                data={filterSpendingsByPayPeriod(spendings, viewYear, viewMonth, paycheckDay)}
                categories={categories}
                currency={summary.currency}
                anim={anim}
                onCategoryPick={(label) => {
                  try {
                    // Find top-spend day for this category within current pay period
                    const nameFor = (s) => s.category_id ? (categories.find(c => c.id === s.category_id)?.name || "Other") : "Other";
                    const filtered = periodSpendings.filter((s) => nameFor(s) === label);
                    if (filtered.length === 0) return;
                    const map = new Map();
                    for (const s of filtered) {
                      const d = new Date(s.spent_at);
                      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
                      map.set(key, (map.get(key) || 0) + s.amount);
                    }
                    let bestKey = null, bestVal = -Infinity;
                    for (const [k, v] of map.entries()) { if (v > bestVal) { bestVal = v; bestKey = k; } }
                    if (bestKey) { setHoverKey(bestKey); scrollToDay(bestKey); }
                  } catch {}
                }}
              />
            )}
          </div>
          <div className="rounded-xl border border-black/10 dark:border-white/15 p-5 backdrop-blur supports-[backdrop-filter]:bg-white/5 dark:supports-[backdrop-filter]:bg-black/20 relative overflow-hidden">
            {loading && <LoadingBar />}
            <h2 className="text-sm mb-2">Daily spend trend</h2>
            {loading ? (
              <div className="w-full h-[200px] rounded bg-white/10 animate-pulse" />
            ) : (
              <LineChart
                data={filterSpendingsByPayPeriod(spendings, viewYear, viewMonth, paycheckDay)}
                startDate={computePeriodStart(viewYear, viewMonth, paycheckDay)}
                numDays={computePeriodDays(viewYear, viewMonth, paycheckDay)}
                currency={summary.currency}
                selectedDay={filterDay}
                onSelectDay={(d)=>scrollToDay(d)}
                hoverKey={hoverKey}
                setHoverKey={setHoverKey}
              />
            )}
          </div>
          <div className="rounded-xl border border-black/10 dark:border-white/15 p-5 backdrop-blur supports-[backdrop-filter]:bg-white/5 dark:supports-[backdrop-filter]:bg-black/20 md:col-span-2 relative overflow-hidden">
            {loading && <LoadingBar />}
            <h2 className="text-sm mb-2">Cumulative vs ideal</h2>
            {loading ? (
              <div className="w-full h-[200px] rounded bg-white/10 animate-pulse" />
            ) : (
              <CumulativeChart
                data={filterSpendingsByPayPeriod(spendings, viewYear, viewMonth, paycheckDay)}
                goal={summary.month_goal}
                startDate={computePeriodStart(viewYear, viewMonth, paycheckDay)}
                numDays={computePeriodDays(viewYear, viewMonth, paycheckDay)}
                currency={summary.currency}
                selectedDay={filterDay}
                onSelectDay={(d)=>scrollToDay(d)}
                hoverKey={hoverKey}
                setHoverKey={setHoverKey}
              />
            )}
          </div>
        </section>
      )}

      <section className="grid gap-6">
        <div className="rounded-xl border border-black/10 dark:border-white/15 p-5 backdrop-blur supports-[backdrop-filter]:bg-white/5 dark:supports-[backdrop-filter]:bg-black/20 relative overflow-hidden">
          {loading && <LoadingBar />}
          <div className="mb-3">
            <h2 className="text-sm mb-3">Recent spendings</h2>
            {loading ? (
              <div className="flex items-center justify-center gap-2 px-4 w-full">
                <div className="h-9 w-12 rounded-md bg-white/10 animate-pulse" />
                <div className="h-9 w-12 rounded-md bg-white/10 animate-pulse" />
                <div className="h-9 w-12 rounded-md bg-white/10 animate-pulse" />
                <div className="h-9 w-12 rounded-md bg-white/10 animate-pulse" />
                <div className="h-9 w-12 rounded-md bg-white/10 animate-pulse" />
                <div className="h-9 w-12 rounded-md bg-white/10 animate-pulse" />
              </div>
            ) : (
              <DayWheel
                startDate={computePeriodStart(viewYear, viewMonth, paycheckDay)}
                numDays={computePeriodDays(viewYear, viewMonth, paycheckDay)}
                selectedDay={filterDay}
                onChange={(key) => { setFilterDay(key); if (key) scrollToDay(key); }}
              />
            )}
          </div>
          <div ref={listRef} className="space-y-2 max-h-[360px] overflow-auto pr-1">
            {(() => {
              // Limit to pay period and sort within a selected day by amount desc
              const start = computePeriodStart(viewYear, viewMonth, paycheckDay);
              const end = computePeriodEnd(viewYear, viewMonth, paycheckDay);
              const inPeriod = spendings.filter((s) => {
                const d = new Date(s.spent_at);
                return d >= start && d < end;
              });
              const arr = filterDay ? inPeriod
                .filter((s) => {
                  const d = new Date(s.spent_at);
                  const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
                  return key === filterDay;
                })
                .slice()
                .sort((a, b) => b.amount - a.amount)
                : inPeriod;
              return arr.map((s) => {
                const d = new Date(s.spent_at);
                const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
                if (filterDay && key !== filterDay) return null;
                return (
                  <div key={s.id} data-day={key} className="flex items-center justify-between text-sm border-b border-black/5 dark:border-white/10 py-2">
                    <div className="truncate">
                      <div className="font-medium">{s.description || (s.category_id ? categories.find(c => c.id === s.category_id)?.name : "Spending")}</div>
                      <div className="text-black/60 dark:text-white/60">{d.toLocaleString()}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="font-mono">{s.amount.toFixed(2)} {s.currency}</div>
                      <button onClick={() => openEditSpending(s)} className="text-xs underline">Edit</button>
                      <button onClick={() => deleteSpending(s.id)} className="text-xs underline text-red-500">Delete</button>
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        </div>
      </section>
      <AddSpendingFAB categories={categories} currency={summary?.currency} onSpendingCreated={onSpendingCreated} onCategoryCreated={addLocalCategory} />
      {editing && <EditSpendingModal spending={editing} onSaved={replaceSpending} onClosed={() => setEditing(null)} />}
      {deleting != null && <DeleteSpendingModal id={deleting} onDeleted={onDeleted} onClosed={() => setDeleting(null)} />}
    </div>
  );
}
function LoadingBar() {
  return (
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
  );
}
function MonthPickerInline({ year, month, onChange }) {
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  function shiftYear(delta) {
    onChange?.(year + delta, month);
  }
  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-1">
        <button onClick={() => shiftYear(-1)} className="h-8 w-8 grid place-items-center rounded-md border border-white/15 hover:ring-1 hover:ring-white/30 transition" aria-label="Previous year">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="opacity-80"><path d="M15 19l-7-7 7-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <div className="min-w-[64px] text-center text-sm text-black/70 dark:text-white/70">{year}</div>
        <button onClick={() => shiftYear(1)} className="h-8 w-8 grid place-items-center rounded-md border border-white/15 hover:ring-1 hover:ring-white/30 transition" aria-label="Next year">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="opacity-80"><path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
      </div>
      <div className="overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-2 px-1">
          {monthNames.map((label, i) => {
            const m = i + 1;
            const active = m === month;
            return (
              <button
                key={label}
                onClick={() => onChange?.(year, m)}
                className={`h-8 px-3 rounded-md border text-sm whitespace-nowrap ${active ? 'border-white/60' : 'border-white/20'} backdrop-blur supports-[backdrop-filter]:bg-white/5 text-white hover:ring-1 hover:ring-white/30 transition`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function MonthPickerVertical({ year, month, onChange }) {
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button onClick={() => setOpen((v) => !v)} className="h-9 px-3 rounded-md border border-white/15 backdrop-blur supports-[backdrop-filter]:bg-white/5 text-white hover:ring-1 hover:ring-white/30 transition flex items-center gap-2">
        <span className="text-sm whitespace-nowrap">{monthNames[month - 1]} {year}</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={`transition-transform ${open ? 'rotate-180' : ''}`}><path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </button>
      {open && (
        <div className="absolute z-20 mt-2 left-1/2 -translate-x-1/2 min-w-[300px] max-w-[320px] w-auto max-h-60 overflow-auto rounded-md border border-white/15 bg-black/70 p-3 shadow-lg">
          <div className="grid grid-cols-3 gap-2">
            {monthNames.map((label, i) => {
              const m = i + 1;
              const active = m === month;
              return (
                <button key={label} onClick={() => { onChange?.(year, m); setOpen(false); }} className={`h-8 rounded-md border text-sm ${active ? 'border-white/60' : 'border-white/20'} backdrop-blur supports-[backdrop-filter]:bg-white/5 text-white`}>
                  {label}
                </button>
              );
            })}
          </div>
          <div className="mt-2 flex items-center justify-between">
            <button onClick={() => onChange?.(year - 1, month)} className="h-8 px-2 rounded-md border border-white/15 text-white/80">- Year</button>
            <div className="text-xs text-white/60">{year}</div>
            <button onClick={() => onChange?.(year + 1, month)} className="h-8 px-2 rounded-md border border-white/15 text-white/80">+ Year</button>
          </div>
        </div>
      )}
    </div>
  );
}

function DonutChart({ data, categories, currency, anim = 1, onCategoryPick }) {
  const [activeLabel, setActiveLabel] = useState(null);
  const totals = new Map();
  data.forEach((s) => {
    const name = s.category_id ? (categories.find(c => c.id === s.category_id)?.name || "Other") : "Other";
    totals.set(name, (totals.get(name) || 0) + s.amount);
  });
  const entries = Array.from(totals.entries()).sort((a, b) => b[1] - a[1]);
  const sum = entries.reduce((a, [, v]) => a + v, 0) || 1;
  const colors = ["#22d3ee", "#8b5cf6", "#f472b6", "#34d399", "#f59e0b", "#ef4444"]; // neon-ish accents
  let angle = 0;
  const radius = 70;
  const size = 200;
  const cx = size / 2, cy = size / 2; // svg center
  const arcs = entries.map(([name, value], idx) => {
    const portion = value / sum;
    const start = angle;
    const end = angle + portion * Math.PI * 2;
    angle = end;
    const largeArc = end - start > Math.PI ? 1 : 0;
    const x1 = cx + radius * Math.cos(start);
    const y1 = cy + radius * Math.sin(start);
    const x2 = cx + radius * Math.cos(end);
    const y2 = cy + radius * Math.sin(end);
    const d = `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;
    const mid = (start + end) / 2;
    const offsetX = Math.cos(mid) * 6;
    const offsetY = Math.sin(mid) * 6;
    return { d, color: colors[idx % colors.length], label: name, value, offsetX, offsetY };
  });
  // sweep clip for roll-out
  const sweepId = useId();
  const [t, setT] = useState(0);
  useEffect(() => {
    let raf;
    const start = performance.now();
    const duration = 800;
    function frame(ts) { const p = Math.min(1, (ts - start) / duration); const eased = 1 - Math.pow(1 - p, 3); setT(eased); if (p < 1) raf = requestAnimationFrame(frame);} 
    setT(0); raf = requestAnimationFrame(frame); return () => cancelAnimationFrame(raf);
  }, [sum, entries.length]);
  const endAngle = -Math.PI / 2 + t * Math.PI * 2;
  const sx = cx + (radius + 5) * Math.cos(-Math.PI / 2);
  const sy = cy + (radius + 5) * Math.sin(-Math.PI / 2);
  const ex = cx + (radius + 5) * Math.cos(endAngle);
  const ey = cy + (radius + 5) * Math.sin(endAngle);
  const largeArc = endAngle - (-Math.PI / 2) > Math.PI ? 1 : 0;
  const sector = `M ${cx} ${cy} L ${sx} ${sy} A ${radius + 5} ${radius + 5} 0 ${largeArc} 1 ${ex} ${ey} Z`;
  const useClip = t < 0.999;
  const [hoverIdx, setHoverIdx] = useState(null);
  const legendRef = useRef(null);
  useEffect(() => {
    if (!legendRef.current || !activeLabel) return;
    const el = legendRef.current.querySelector(`[data-label="${CSS.escape(activeLabel)}"]`);
    if (el) { el.scrollIntoView({ block: 'nearest' }); }
  }, [activeLabel]);
  return (
    <div className="flex items-start gap-4">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {useClip && (
          <clipPath id={sweepId}>
            <path d={sector} />
          </clipPath>
        )}
        <g {...(useClip ? { clipPath: `url(#${sweepId})` } : {})}>
          {arcs.map((a, i) => (
            <path key={i} d={a.d} fill={a.color} opacity={hoverIdx === i || activeLabel === a.label ? "1" : "0.85"} transform={hoverIdx === i || activeLabel === a.label ? `translate(${a.offsetX} ${a.offsetY})` : undefined} onMouseEnter={() => setHoverIdx(i)} onMouseLeave={() => setHoverIdx(null)} onClick={() => { setActiveLabel(a.label); onCategoryPick?.(a.label); }}>
              <title>{`${a.label}: ${a.value.toFixed(2)} ${currency}`}</title>
            </path>
          ))}
        </g>
        <circle cx={cx} cy={cy} r={50} fill="var(--background)" />
      </svg>
      <div className="text-sm space-y-1 max-h-[200px] overflow-auto pr-1" ref={legendRef}>
        {entries.map(([name, v], i) => (
          <div key={name} data-label={name} className={`flex items-center gap-2 px-1 rounded ${activeLabel === name ? 'bg-white/10' : ''}`} onMouseEnter={() => setHoverIdx(i)} onMouseLeave={() => setHoverIdx(null)} onClick={() => { setActiveLabel(name); onCategoryPick?.(name); }}>
            <span className="inline-block w-3 h-3 rounded-sm" style={{ background: colors[i % colors.length] }}></span>
            {(v * anim).toFixed(2)} {currency} — {name}
          </div>
        ))}
      </div>
    </div>
  );

  // no helper needed; we compute mid-angle per arc
}

// Pay period helpers
function clampPaycheckDay(d) {
  const n = Number(d) || 1;
  if (n < 1) return 1;
  if (n > 28) return 28;
  return n;
}

function computePeriodStart(year, month, paycheckDay) {
  const day = clampPaycheckDay(paycheckDay);
  return new Date(year, month - 1, day);
}

function computePeriodEnd(year, month, paycheckDay) {
  const start = computePeriodStart(year, month, paycheckDay);
  return new Date(start.getFullYear(), start.getMonth() + 1, start.getDate());
}

function computePeriodDays(year, month, paycheckDay) {
  const start = computePeriodStart(year, month, paycheckDay);
  const end = computePeriodEnd(year, month, paycheckDay);
  const MS_PER_DAY = 24 * 60 * 60 * 1000;
  return Math.max(1, Math.round((end - start) / MS_PER_DAY));
}

function filterSpendingsByPayPeriod(spendings, year, month, paycheckDay) {
  const start = computePeriodStart(year, month, paycheckDay);
  const end = computePeriodEnd(year, month, paycheckDay);
  return spendings.filter((s) => {
    const d = new Date(s.spent_at);
    return d >= start && d < end;
  });
}
function formatDayKey(key) {
  try {
    const [y, m, d] = key.split('-').map((x) => parseInt(x, 10));
    const dt = new Date(y, m - 1, d);
    return dt.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch {
    return key;
  }
}

function tooltipAlignClass(percent) {
  try {
    const p = Number(percent) || 0;
    if (p <= 8) return 'translate-x-0';
    if (p >= 92) return '-translate-x-full';
    return '-translate-x-1/2';
  } catch {
    return '-translate-x-1/2';
  }
}

function tooltipVerticalClass(percent) {
  try {
    const p = Number(percent) || 0;
    // Near edges, prefer placing below to avoid header/edges
    if (p < 15 || p > 85) return 'top-4'; // below the bar
    return '-top-8'; // above the bar
  } catch {
    return '-top-8';
  }
}

function computeLabelLayout(p1, p2) {
  const SEP = 6; // minimum percent separation to avoid horizontal overlap
  let left1 = p1 != null ? p1 : null;
  let left2 = p2 != null ? p2 : null;
  // Default: place both labels under the bar
  let v1 = 'top-4';
  let v2 = 'top-4';
  if (left1 != null && left2 != null) {
    if (Math.abs(left1 - left2) < SEP) {
      // Stack both under with a small vertical gap
      v1 = 'top-4';
      v2 = 'top-8';
    }
  }
  return { left1, left2, v1, v2 };
}

function LineChart({ data, startDate, numDays, currency, selectedDay, onSelectDay, hoverKey, setHoverKey }) {
  // group by day in pay period
  const dayToSum = new Map();
  data.forEach((s) => {
    const d = new Date(s.spent_at);
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    dayToSum.set(key, (dayToSum.get(key) || 0) + s.amount);
  });
  const values = [];
  const dayKeys = [];
  for (let i = 0; i < numDays; i++) {
    const d = new Date(startDate.getTime());
    d.setDate(d.getDate() + i);
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    dayKeys.push(key);
    values.push(dayToSum.get(key) || 0);
  }
  const h = 200, padding = 16;
  const maxV = Math.max(1, ...values);
  const [hover, setHover] = useState(null);
  const [w, setW] = useState(520);
  const [drawP, setDrawP] = useState(0);
  const [pathLen, setPathLen] = useState(0);
  const pathRef = useRef(null);
  const ref = useRef(null);
  useEffect(() => {
    function measure() { if (ref.current) { setW(ref.current.clientWidth); } }
    measure();
    const ro = new ResizeObserver(measure);
    if (ref.current) ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  useEffect(() => {
    if (pathRef.current) {
      try { setPathLen(pathRef.current.getTotalLength()); } catch {}
      let raf;
      const start = performance.now();
      const duration = 800;
      function frame(t) {
        const p = Math.min(1, (t - start) / duration);
        const eased = 1 - Math.pow(1 - p, 3);
        setDrawP(eased);
        if (p < 1) raf = requestAnimationFrame(frame);
      }
      setDrawP(0);
      raf = requestAnimationFrame(frame);
      return () => cancelAnimationFrame(raf);
    }
  }, [values.length, w]);
  const xAt = (i) => padding + i * (values.length > 1 ? (w - padding * 2) / (values.length - 1) : 0);
  const yAt = (v) => h - padding - (v / maxV) * (h - padding * 2);
  const bandX = (i) => {
    const prev = xAt(Math.max(0, i - 1));
    const cur = xAt(i);
    const next = xAt(Math.min(values.length - 1, i + 1));
    const left = i === 0 ? padding : (prev + cur) / 2;
    const right = i === values.length - 1 ? w - padding : (cur + next) / 2;
    return { left, right };
  };
  return (
    <div ref={ref} className="w-full">
      <svg width={w} height={h} className="block" onMouseLeave={() => { setHover(null); setHoverKey(null); }}>
        <defs>
          <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#a78bfa" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#22d3ee" stopOpacity="0.2" />
          </linearGradient>
        </defs>
        <path ref={pathRef} d={values.map((v,i)=>`${i===0?"M":"L"} ${xAt(i)} ${yAt(v)}`).join(" ")} fill="none" stroke="url(#grad)" strokeWidth="2" style={{ strokeDasharray: pathLen, strokeDashoffset: Math.max(0, (1 - drawP) * pathLen) }} />
        {values.map((v, i) => {
          const x = xAt(i);
          const y = yAt(v);
          const { left, right } = bandX(i);
          const visible = drawP >= (i / Math.max(1, values.length - 1));
          const key = dayKeys[i];
          return (
            <g key={i}>
              <rect x={left} y={padding} width={Math.max(0, right - left)} height={h - padding * 2} fill="transparent" onMouseMove={() => { setHover({ i, v, x, y }); setHoverKey(key); }} onClick={() => onSelectDay?.(key)} />
              <circle cx={x} cy={y} r={hover?.i === i ? 5 : (selectedDay === key ? 5 : 3)} fill={selectedDay === key ? '#22d3ee' : '#8b5cf6'} opacity={visible ? 1 : 0} />
            </g>
          );
        })}
        {(() => {
          const idx = hover?.i ?? (hoverKey ? dayKeys.indexOf(hoverKey) : -1);
          if (idx == null || idx < 0) return null;
          const x = xAt(idx);
          const y = yAt(values[idx]);
          const label = formatDayKey(dayKeys[idx]);
          return (
            <g>
              <line x1={x} x2={x} y1={padding} y2={h - padding} stroke="#ffffff30" />
              <rect x={Math.min(Math.max(x + 8, padding), w - 180)} y={Math.max(y - 28, padding)} width="172" height="26" rx="6" fill="#0b0b0bcc" />
              <text x={Math.min(Math.max(x + 14, padding + 6), w - 172 + 6)} y={Math.max(y - 11, padding + 12)} fill="#fff" fontSize="12">{label}: {values[idx].toFixed(2)} {currency}</text>
            </g>
          );
        })()}
      </svg>
    </div>
  );
}

function CumulativeChart({ data, goal, startDate, numDays, currency, selectedDay, onSelectDay, hoverKey, setHoverKey }) {
  const h = 200, padding = 16;
  const byDay = new Map();
  data.forEach((s) => {
    const d = new Date(s.spent_at);
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    byDay.set(key, (byDay.get(key) || 0) + s.amount);
  });
  const points = [];
  const dayKeys = [];
  let acc = 0;
  for (let i = 0; i < numDays; i++) {
    const d = new Date(startDate.getTime());
    d.setDate(d.getDate() + i);
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    acc += byDay.get(key) || 0;
    dayKeys.push(key);
    points.push(acc);
  }
  const maxV = Math.max(goal || 0, ...points, 1);
  const [hover, setHover] = useState(null);
  const [w, setW] = useState(520);
  const [drawP, setDrawP] = useState(0);
  const [drawPIdeal, setDrawPIdeal] = useState(0);
  const [pathLen, setPathLen] = useState(0);
  const [pathLenIdeal, setPathLenIdeal] = useState(0);
  const pathRef = useRef(null);
  const pathRefIdeal = useRef(null);
  const ref = useRef(null);
  useEffect(() => { function measure() { if (ref.current) setW(ref.current.clientWidth); } measure(); const ro = new ResizeObserver(measure); if (ref.current) ro.observe(ref.current); return () => ro.disconnect(); }, []);
  useEffect(() => {
    if (pathRef.current) {
      try { setPathLen(pathRef.current.getTotalLength()); } catch {}
      let raf; const start = performance.now(); const duration = 800;
      function frame(t) { const p = Math.min(1, (t - start) / duration); const eased = 1 - Math.pow(1 - p, 3); setDrawP(eased); if (p < 1) raf = requestAnimationFrame(frame);} setDrawP(0); raf = requestAnimationFrame(frame); return () => cancelAnimationFrame(raf);
    }
  }, [points.length, w]);
  useEffect(() => {
    if (pathRefIdeal.current) {
      try { setPathLenIdeal(pathRefIdeal.current.getTotalLength()); } catch {}
      let raf; const start = performance.now(); const duration = 800;
      function frame(t) { const p = Math.min(1, (t - start) / duration); const eased = 1 - Math.pow(1 - p, 3); setDrawPIdeal(eased); if (p < 1) raf = requestAnimationFrame(frame);} setDrawPIdeal(0); raf = requestAnimationFrame(frame); return () => cancelAnimationFrame(raf);
    }
  }, [goal, w]);
  const xAt = (i) => padding + i * (points.length > 1 ? (w - padding * 2) / (points.length - 1) : 0);
  const yAt = (v) => h - padding - (v / maxV) * (h - padding * 2);
  const bandX = (i) => { const prev = xAt(Math.max(0, i - 1)); const cur = xAt(i); const next = xAt(Math.min(points.length - 1, i + 1)); const left = i === 0 ? padding : (prev + cur) / 2; const right = i === points.length - 1 ? w - padding : (cur + next) / 2; return { left, right }; };
  // ideal path (sloped): from 0 at left to goal at right
  const idealPathD = goal ? `M ${padding} ${yAt(0)} L ${w - padding} ${yAt(goal)}` : "";
  return (
    <div ref={ref} className="w-full">
      <svg width={w} height={h} className="block" onMouseLeave={() => { setHover(null); setHoverKey(null); }}>
        {goal && (
          <path ref={pathRefIdeal} d={idealPathD} fill="none" stroke="#22d3ee" strokeDasharray={4} style={{ strokeDasharray: pathLenIdeal, strokeDashoffset: Math.max(0, (1 - drawPIdeal) * pathLenIdeal) }} />
        )}
        <path ref={pathRef} d={points.map((v,i)=>`${i===0?"M":"L"} ${xAt(i)} ${yAt(v)}`).join(" ")} fill="none" stroke="#8b5cf6" strokeWidth="2" style={{ strokeDasharray: pathLen, strokeDashoffset: Math.max(0, (1 - drawP) * pathLen) }} />
        {points.map((v, i) => { const { left, right } = bandX(i); const x = xAt(i); const y = yAt(v); const visible = drawP >= (i / Math.max(1, points.length - 1)); const key = dayKeys[i]; const isSel = selectedDay === key; return (
          <g key={i}>
            <rect x={left} y={padding} width={Math.max(0, right - left)} height={h - padding * 2} fill="transparent" onMouseMove={() => { setHover({ i, v, x, y }); setHoverKey(key); }} onClick={() => onSelectDay?.(key)} />
            <circle cx={x} cy={y} r={hover?.i === i ? 5 : (isSel ? 5 : 3)} fill={isSel ? '#22d3ee' : '#8b5cf6'} opacity={visible ? 1 : 0} />
          </g>
        ); })}
        {(() => {
          const idx = hover?.i ?? (hoverKey ? dayKeys.indexOf(hoverKey) : -1);
          if (idx == null || idx < 0) return null;
          const x = xAt(idx);
          const y = yAt(points[idx]);
          const label = formatDayKey(dayKeys[idx]);
          return (
            <g>
              <line x1={x} x2={x} y1={padding} y2={h - padding} stroke="#ffffff30" />
              <rect x={Math.min(Math.max(x + 8, padding), w - 220)} y={Math.max(y - 40, padding)} width="212" height="38" rx="6" fill="#0b0b0bcc" />
              <text x={Math.min(Math.max(x + 14, padding + 6), w - 212 + 6)} y={Math.max(y - 23, padding + 12)} fill="#fff" fontSize="12">{label} — Cum: {points[idx].toFixed(2)} {currency}</text>
              {goal && <text x={Math.min(Math.max(x + 14, padding + 6), w - 212 + 6)} y={Math.max(y - 9, padding + 24)} fill="#aee" fontSize="12">Ideal: {(goal * (idx/Math.max(1, points.length-1))).toFixed(2)} {currency}</text>}
            </g>
          );
        })()}
      </svg>
    </div>
  );
}

function AddSpendingFAB({ categories, currency, onSpendingCreated, onCategoryCreated }) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [openCategory, setOpenCategory] = useState(false);
  const [newCat, setNewCat] = useState("");
  const authFetch = useAuthFetch();

  async function submitSpending() {
    const body = { amount: parseFloat(amount), category_id: categoryId || null, description };
    if (date) { body.spent_at = new Date(date).toISOString(); }
    const res = await authFetch("/spendings", { method: "POST", body: JSON.stringify(body) });
    const data = await res.json();
    if (res.ok) { onSpendingCreated?.(data); setOpen(false); setAmount(""); setCategoryId(""); setDescription(""); }
  }

  async function createCategory() {
    if (!newCat) return;
    const res = await authFetch("/categories", { method: "POST", body: JSON.stringify({ name: newCat }) });
    const data = await res.json();
    if (res.ok) { onCategoryCreated?.(data); setOpenCategory(false); setNewCat(""); setCategoryId(String(data.id)); }
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="fixed bottom-6 right-6 h-11 px-5 rounded-md border border-white/20 backdrop-blur supports-[backdrop-filter]:bg-white/5 text-white hover:ring-1 hover:ring-white/30 transition">
        New expense
      </button>
      {open && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur grid place-items-center p-4" onClick={() => setOpen(false)}>
          <div className="w-full max-w-sm rounded-xl border border-white/15 bg-black/60 p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base">New expense</h3>
              <button className="h-8 w-8 rounded-md border border-white/15 hover:ring-1 hover:ring-white/30" onClick={() => setOpen(false)} aria-label="Close">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="mx-auto"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
              </button>
            </div>
            <div className="grid gap-3">
              <div className="relative">
                <input value={amount} onChange={(e) => setAmount(e.target.value)} type="number" placeholder="Amount" className="w-full h-11 rounded-md border border-white/15 bg-transparent pl-3 pr-10 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                <span className="absolute inset-y-0 right-2 grid place-items-center text-white/70 text-sm pointer-events-none">{currency || 'CZK'}</span>
              </div>
              <div className="flex gap-2">
                <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="flex-1 h-11 rounded-md border border-white/15 bg-transparent px-3">
                  <option value="">No category</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <button className="h-11 px-3 rounded-md border border-white/15" onClick={() => setOpenCategory(true)}>New</button>
              </div>
              <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description (optional)" className="w-full h-11 rounded-md border border-white/15 bg-transparent px-3" />
              <input type="date" value={date} onChange={(e)=> setDate(e.target.value)} className="w-full h-11 rounded-md border border-white/15 bg-transparent px-3" />
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button className="h-10 px-4 rounded-md border border-white/15" onClick={() => setOpen(false)}>Cancel</button>
              <button className="h-10 px-4 rounded-md bg-[radial-gradient(circle_at_50%_0%,_#22d3ee,_#06b6d4)] text-white" onClick={submitSpending}>Add</button>
            </div>
          </div>
        </div>
      )}
      {openCategory && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur grid place-items-center p-4" onClick={() => setOpenCategory(false)}>
          <div className="w-full max-w-sm rounded-xl border border-white/15 bg-black/50 p-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-3">Create category</h3>
            <input value={newCat} onChange={(e) => setNewCat(e.target.value)} placeholder="Name" className="w-full h-11 rounded-md border border-white/15 bg-transparent px-3 mb-3" />
            <div className="flex justify-end gap-2">
              <button className="h-10 px-4 rounded-md border border-white/15" onClick={() => setOpenCategory(false)}>Cancel</button>
              <button className="h-10 px-4 rounded-md bg-[radial-gradient(circle_at_50%_0%,_#22d3ee,_#06b6d4)] text-white" onClick={createCategory}>Create</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function EditSpendingModal({ spending, onSaved, onClosed }) {
  const [form, setForm] = useState({ ...spending });
  const authFetch = useAuthFetch();
  async function save() {
    const res = await authFetch(`/spendings/${spending.id}`, { method: "PUT", body: JSON.stringify({ amount: Number(form.amount), description: form.description }) });
    const data = await res.json();
    if (res.ok) { onSaved?.(data); onClosed?.(); }
  }
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur grid place-items-center p-4" onClick={onClosed}>
      <div className="w-full max-w-sm rounded-xl border border-white/15 bg-black/50 p-5" onClick={(e) => e.stopPropagation()}>
        <h3 className="mb-3">Edit expense</h3>
        <input value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} type="number" className="w-full h-11 rounded-md border border-white/15 bg-transparent px-3 mb-3 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
        <input value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full h-11 rounded-md border border-white/15 bg-transparent px-3 mb-3" />
        <div className="flex justify-end gap-2">
          <button className="h-10 px-4 rounded-md border border-white/15" onClick={onClosed}>Cancel</button>
          <button className="h-10 px-4 rounded-md bg-[radial-gradient(circle_at_50%_0%,_#a78bfa,_#8b5cf6)] text-white" onClick={save}>Save</button>
        </div>
      </div>
    </div>
  );
}

function DeleteSpendingModal({ id, onDeleted, onClosed }) {
  const [busy, setBusy] = useState(false);
  async function handleDelete() {
    if (busy) return;
    setBusy(true);
    try {
      await onDeleted?.(id);
      onClosed?.();
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur grid place-items-center p-4" onClick={onClosed}>
      <div className="w-full max-w-sm rounded-xl border border-white/15 bg-black/50 p-5" onClick={(e) => e.stopPropagation()}>
        <h3 className="mb-3">Delete spending</h3>
        <p className="text-sm mb-4 text-white/80">This action cannot be undone.</p>
        <div className="flex justify-end gap-2">
          <button className="h-10 px-4 rounded-md border border-white/15" onClick={onClosed} disabled={busy}>Cancel</button>
          <button className={`h-10 px-4 rounded-md ${busy ? 'bg-red-500/50' : 'bg-red-500/90'} text-white flex items-center justify-center`} onClick={handleDelete} disabled={busy}>
            {busy ? (
              <span className="inline-block h-4 w-4 rounded-full border-2 border-white/80 border-t-transparent animate-spin" aria-label="Deleting" />
            ) : (
              'Delete'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function getChartData(spendings, demoMode, year, month) {
  if (!demoMode) return spendings;
  const demo = generateDemoSpendings(year, month);
  return [...spendings, ...demo];
}

function generateDemoSpendings(year, month) {
  const days = new Date(year, month, 0).getDate();
  const out = [];
  for (let d = 1; d <= days; d += 3) {
    const amount = 100 + Math.round(Math.sin(d / days * Math.PI) * 80) + Math.round(Math.random() * 40);
    out.push({ id: -d, user_id: 0, category_id: null, amount, currency: "CZK", description: "demo", spent_at: new Date(year, month - 1, d).toISOString() });
  }
  return out;
}

function DayWheel({ startDate, numDays, selectedDay, onChange }) {
  const items = useMemo(() => [null, ...Array.from({ length: numDays }, (_, i) => i + 1)], [numDays]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const internalUpdateRef = useRef(false);
  const lastIndexRef = useRef(-1);
  const isAnimatingRef = useRef(false);
  const isDraggingRef = useRef(false);
  const lastEmitTsRef = useRef(0);
  const rafPendingRef = useRef(false);

  const keyFor = useCallback((d) => {
    if (!d) return null;
    const dt = new Date(startDate.getTime());
    dt.setDate(dt.getDate() + (d - 1));
    return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
  }, [startDate]);

  const labelFor = useCallback((d) => {
    if (!d) return 'All';
    const dt = new Date(startDate.getTime());
    dt.setDate(dt.getDate() + (d - 1));
    return dt.getDate();
  }, [startDate]);

  function indexForSelectedDay(key) {
    if (!key) return 0;
    try {
      const [y, m, day] = key.split('-').map((x) => parseInt(x, 10));
      const sel = new Date(y, m - 1, day);
      const msPerDay = 24 * 60 * 60 * 1000;
      const diff = Math.floor((sel.setHours(0,0,0,0) - new Date(startDate.getTime()).setHours(0,0,0,0)) / msPerDay);
      if (diff < 0 || diff >= numDays) return 0;
      return diff + 1; // +1 because index 0 is 'All'
    } catch {
      return 0;
    }
  }

  const [sliderRef, slider] = useKeenSlider({
    loop: true,
    rubberband: true,
    mode: "free-snap",
    renderMode: "performance",
    slides: { perView: 7, spacing: 8, origin: "center" },
    created(s) {
      const idx = indexForSelectedDay(selectedDay);
      try { s.moveToIdx(idx, true); } catch {}
      setSelectedIndex(idx);
      internalUpdateRef.current = true;
      onChange?.(keyFor(items[idx]));
      lastIndexRef.current = idx;
      Promise.resolve().then(() => { internalUpdateRef.current = false; });
    },
    detailsChanged(s) {
      const idx = s.track.details.rel;
      // Throttle updates to ~60fps max and batch in rAF to avoid fighting physics
      if (rafPendingRef.current) return;
      rafPendingRef.current = true;
      requestAnimationFrame(() => {
        rafPendingRef.current = false;
        setSelectedIndex(idx);
        const now = performance.now();
        if (idx !== lastIndexRef.current && now - lastEmitTsRef.current > 40) {
          internalUpdateRef.current = true;
          onChange?.(keyFor(items[idx]));
          lastIndexRef.current = idx;
          lastEmitTsRef.current = now;
          Promise.resolve().then(() => { internalUpdateRef.current = false; });
        }
      });
    },
    animationStarted() {
      isAnimatingRef.current = true;
    },
    animationEnded(s) {
      isAnimatingRef.current = false;
      const idx = s.track.details.rel;
      setSelectedIndex(idx);
      internalUpdateRef.current = true;
      onChange?.(keyFor(items[idx]));
      lastIndexRef.current = idx;
      Promise.resolve().then(() => { internalUpdateRef.current = false; });
    },
    dragStarted() { isDraggingRef.current = true; },
    dragEnded() { isDraggingRef.current = false; },
    updated(s) {
      const idx = s.track.details.rel;
      setSelectedIndex(idx);
    },
  });

  useEffect(() => {
    if (!slider?.current) return;
    if (internalUpdateRef.current) return; // ignore internal updates during spin
    if (isAnimatingRef.current || isDraggingRef.current) return; // don't fight momentum or drag
    const idx = indexForSelectedDay(selectedDay);
    try { slider.current.moveToIdx(idx, true); } catch {}
    setSelectedIndex(idx);
  }, [slider, selectedDay, startDate, numDays]);

  const selectByIndex = useCallback((i) => {
    try { slider?.current?.moveToIdx(i); } catch {}
  }, [slider]);

  return (
    <div className="flex flex-col items-center">
      <div className="relative flex items-center justify-center">
        <div className="px-4 w-[360px]">
          <div ref={sliderRef} className="keen-slider">
          {items.map((d, i) => {
            const active = selectedIndex === i;
            const isAll = d === null;
            return (
              <div key={i} className="keen-slider__slide !w-auto min-w-[56px]">
                <div className={`flex-[0_0_auto]`}>
                  <button onClick={() => selectByIndex(i)} className={`h-9 w-10 rounded-md border ${active ? 'border-white/60' : 'border-white/20'} backdrop-blur supports-[backdrop-filter]:bg-white/5 text-white text-sm hover:ring-1 hover:ring-white/30 transition`}>{labelFor(d)}</button>
                </div>
              </div>
            );
          })}
          </div>
        </div>
        <div className="pointer-events-none absolute inset-y-0 left-0 w-6 bg-gradient-to-r from-background to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-6 bg-gradient-to-l from-background to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 left-1/2 -translate-x-1/2 w-[64px] border-x border-white/10" />
      </div>
      {selectedIndex !== 0 && (
        <button
          onClick={() => selectByIndex(0)}
          aria-label="Back to All"
          className={`mt-1 h-9 w-10 rounded-md border border-white/20 backdrop-blur supports-[backdrop-filter]:bg-white/5 text-white hover:ring-1 hover:ring-white/30 transition`}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="mx-auto">
            <path d="M15 19l-7-7 7-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      )}
    </div>
  );
}



