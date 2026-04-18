"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { login } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/types";
import { setTokens } from "@/lib/auth/token-store";
import { AuthShell } from "@/components/auth/auth-shell";
import { AuthFeedback } from "@/components/auth/auth-feedback";
import { useLanguage } from "@/components/i18n/language-context";

export default function LoginPage() {
  const router = useRouter();
  const { language } = useLanguage();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const text =
    language === "bn"
      ? {
          title: "ফিরে আসুন",
          subtitle: "আপনার যাত্রা চালিয়ে যেতে সাইন ইন করুন",
          footerText: "অ্যাকাউন্ট নেই?",
          footerCta: "সাইন আপ",
          username: "ইউজারনেম",
          usernamePlaceholder: "ইউজারনেম বা ইমেইল",
          password: "পাসওয়ার্ড",
          passwordPlaceholder: "পাসওয়ার্ড",
          rememberMe: "আমাকে মনে রাখুন",
          forgot: "ভুলে গেছেন?",
          loginFailed: "লগইন ব্যর্থ হয়েছে। আপনার তথ্য যাচাই করুন।",
          unexpectedError: "লগইন করার সময় অপ্রত্যাশিত ত্রুটি হয়েছে।",
          signingIn: "সাইন ইন হচ্ছে...",
          signIn: "সাইন ইন",
          continueWith: "অথবা চালিয়ে যান",
          google: "গুগল দিয়ে চালিয়ে যান",
          apple: "অ্যাপল দিয়ে চালিয়ে যান",
          github: "গিটহাব দিয়ে চালিয়ে যান",
        }
      : {
          title: "Welcome Back",
          subtitle: "Sign in to continue your journey",
          footerText: "Do not have an account?",
          footerCta: "Sign up",
          username: "Username",
          usernamePlaceholder: "Username or Email",
          password: "Password",
          passwordPlaceholder: "Password",
          rememberMe: "Remember me",
          forgot: "Forgot?",
          loginFailed: "Login failed. Check your credentials.",
          unexpectedError: "Unexpected error while logging in.",
          signingIn: "Signing in...",
          signIn: "Sign in",
          continueWith: "or continue with",
          google: "Continue with Google",
          apple: "Continue with Apple",
          github: "Continue with Github",
        };

  const labelClass = "sr-only";
  const inputClass =
    "block min-h-12 w-full rounded-2xl border border-[#9ce0bd] bg-[#e7f8ef]/70 px-4 py-3 text-[0.96rem] text-[#143625] outline-none transition placeholder:text-[#5c8e73] focus:border-[#2fca7d] focus:bg-[#f8fffb] focus:shadow-[0_0_0_4px_#2fca7d26]";
  const buttonClass =
    "inline-flex min-h-12 w-full items-center justify-center rounded-2xl border border-transparent bg-gradient-to-b from-[#21c86f] to-[#16b861] px-4 py-2 font-semibold text-[#ffffff] transition hover:-translate-y-[1px] hover:shadow-[0_12px_20px_#0d75463b] disabled:cursor-not-allowed disabled:opacity-70 disabled:shadow-none";

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
        setError(err.message || text.loginFailed);
      } else {
        setError(text.unexpectedError);
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <AuthShell
      title={text.title}
      subtitle={text.subtitle}
      footerText={text.footerText}
      footerCtaLabel={text.footerCta}
      footerHref="/signup"
    >
      <form className="grid gap-4" onSubmit={onSubmit}>
        <label htmlFor="username" className={labelClass}>{text.username}</label>
        <input
          id="username"
          name="username"
          className={inputClass}
          autoComplete="username"
          placeholder={text.usernamePlaceholder}
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          required
        />

        <label htmlFor="password" className={labelClass}>{text.password}</label>
        <input
          id="password"
          name="password"
          type="password"
          className={inputClass}
          autoComplete="current-password"
          placeholder={text.passwordPlaceholder}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />

        <div className="flex items-center justify-between text-sm text-[#2a694d]">
          <label className="inline-flex items-center gap-2">
            <input type="checkbox" className="h-4 w-4 rounded border-[#86d8b3] text-[#1cc26c] focus:ring-[#20c772]" />
            <span>{text.rememberMe}</span>
          </label>
          <Link href="/signup" className="font-semibold text-[#16a35a] transition hover:text-[#0e7d44]">
            {text.forgot}
          </Link>
        </div>

        {error ? <AuthFeedback type="error" message={error} /> : null}

        <button type="submit" disabled={isLoading} className={buttonClass}>
          {isLoading ? text.signingIn : text.signIn}
        </button>

        <p className="mt-1 text-center text-sm text-[#579178]">{text.continueWith}</p>
        <div className="flex justify-center gap-3">
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#bde9d1] bg-[#f2fdf7] text-xs font-bold text-[#2d6e51] transition hover:bg-[#e6f9f0]"
            aria-label={text.google}
          >
            G
          </button>
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#bde9d1] bg-[#f2fdf7] text-xs font-bold text-[#2d6e51] transition hover:bg-[#e6f9f0]"
            aria-label={text.apple}
          >
            A
          </button>
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#bde9d1] bg-[#f2fdf7] text-xs font-bold text-[#2d6e51] transition hover:bg-[#e6f9f0]"
            aria-label={text.github}
          >
            GH
          </button>
        </div>
      </form>
    </AuthShell>
  );
}
