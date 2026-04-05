"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { login } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/types";
import { setTokens } from "@/lib/auth/token-store";
import { AuthShell } from "@/components/auth/auth-shell";
import { AuthFeedback } from "@/components/auth/auth-feedback";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const labelClass = "mb-1.5 block text-sm font-semibold text-[#1a2437]";
  const inputClass =
    "block min-h-12 w-full rounded-xl border border-[#d0d9e8] bg-[#fafcff] px-3.5 py-2.5 text-[0.96rem] text-[#0f172a] outline-none transition focus:border-[#1f4fd7] focus:bg-[#ffffff] focus:shadow-[0_0_0_4px_#1f4fd724]";
  const buttonClass =
    "inline-flex min-h-12 w-full items-center justify-center rounded-xl border border-transparent bg-gradient-to-br from-[#1f4fd7] to-[#173ea8] px-4 py-2 font-semibold text-[#ffffff] transition hover:-translate-y-[1px] hover:shadow-[0_12px_22px_#12295a36] disabled:cursor-not-allowed disabled:opacity-70 disabled:shadow-none";

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const response = await login({ username, password });
      setTokens(response.access, response.refresh);
      router.push("/profile");
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message || "Login failed. Check your credentials.");
      } else {
        setError("Unexpected error while logging in.");
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Log in to continue to your CityZen workspace."
      footerText="No account yet?"
      footerCtaLabel="Create one"
      footerHref="/signup"
    >
      <form className="grid gap-4" onSubmit={onSubmit}>
        <label htmlFor="username" className={labelClass}>Username</label>
        <input
          id="username"
          name="username"
          className={inputClass}
          autoComplete="username"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          required
        />

        <label htmlFor="password" className={labelClass}>Password</label>
        <input
          id="password"
          name="password"
          type="password"
          className={inputClass}
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />

        {error ? <AuthFeedback type="error" message={error} /> : null}

        <button type="submit" disabled={isLoading} className={buttonClass}>
          {isLoading ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </AuthShell>
  );
}
