import Link from "next/link";
import { redirect } from "next/navigation";

// Static export compatible; data is fetched client-side

export default function Home() {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("token");
    if (token) {
      window.location.replace("/dashboard");
    }
  }
  return (
    <div className="min-h-screen grid place-items-center p-8">
      <main className="w-full max-w-md text-center space-y-6">
        <h1 className="text-3xl font-medium">Finance Pal</h1>
        <p className="text-black/60 dark:text-white/60">
          Sign in to continue, or create a new account.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <Link
            href="/login"
            className="h-11 rounded-md bg-foreground text-background grid place-items-center hover:opacity-90"
          >
            Login
          </Link>
          <Link
            href="/register"
            className="h-11 rounded-md border border-black/10 dark:border-white/15 grid place-items-center hover:bg-black/5 dark:hover:bg-white/10"
          >
            Register
          </Link>
        </div>
      </main>
    </div>
  );
}
