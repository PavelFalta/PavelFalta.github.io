"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { API_URL } from "../../api-config";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch(API_URL + "/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.detail || "Registration failed");
      router.replace("/login");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen grid place-items-center p-6">
      <div className="w-full max-w-sm rounded-xl border border-white/15 p-5 backdrop-blur supports-[backdrop-filter]:bg-white/5">
        <h1 className="text-2xl font-medium mb-4">Create account</h1>
        <form onSubmit={onSubmit} className="space-y-3">
          <div className="space-y-2">
            <label className="block text-sm">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full h-11 rounded-md border border-black/10 dark:border-white/15 bg-transparent px-3 outline-none focus:ring-2 focus:ring-black/10 dark:focus:ring-white/20"
              placeholder="you@example.com"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full h-11 rounded-md border border-black/10 dark:border-white/15 bg-transparent px-3 outline-none focus:ring-2 focus:ring-black/10 dark:focus:ring-white/20"
              placeholder="••••••••"
            />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full h-11 rounded-md bg-[radial-gradient(circle_at_50%_0%,_#22d3ee,_#06b6d4)] text-white hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {loading ? "Creating…" : "Create account"}
          </button>
        </form>
        <p className="text-sm mt-3 text-black/60 dark:text-white/60">
          Already have an account? <Link href="/login" className="underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}


