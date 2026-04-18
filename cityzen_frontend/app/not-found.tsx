"use client";

import Link from "next/link";
import { useLanguage } from "@/components/providers/language-provider";

export default function NotFound() {
  const { t } = useLanguage();

  return (
    <main className="relative flex min-h-[calc(100dvh-5.5rem)] items-center justify-center overflow-hidden px-4 py-10 sm:px-6">
      <section className="relative w-full max-w-3xl overflow-hidden rounded-3xl border border-white/60 bg-white/75 p-8 shadow-[0_28px_70px_-35px_rgba(15,111,232,0.45)] backdrop-blur-xl sm:p-12">
        <div className="pointer-events-none absolute -left-14 -top-20 h-52 w-52 rounded-full bg-cyan-200/70 blur-3xl" aria-hidden="true" />
        <div className="pointer-events-none absolute -right-14 -bottom-20 h-52 w-52 rounded-full bg-emerald-200/70 blur-3xl" aria-hidden="true" />

        <div className="relative z-10 space-y-6 text-center sm:space-y-7">
          <p className="font-mono text-xs tracking-[0.32em] text-slate-500">{t("ত্রুটি ৪০৪", "ERROR 404")}</p>

          <h1 className="text-balance text-3xl font-semibold leading-tight text-slate-900 sm:text-5xl">
            {t("এই পেজটি শহরের ম্যাপ থেকে হারিয়ে গেছে।", "This page went off the city map.")}
          </h1>

          <p className="mx-auto max-w-xl text-pretty text-sm leading-relaxed text-slate-600 sm:text-base">
            {t(
              "আপনি যে URL চেয়েছেন, সেটি CityZen-এ নেই। এটি সরানো হয়েছে, মুছে গেছে, অথবা ভুল টাইপ হয়েছে।",
              "The URL you requested does not exist in CityZen. It may have moved, been removed, or was typed incorrectly.",
            )}
          </p>

          <div className="flex flex-col items-center justify-center gap-3 pt-2 sm:flex-row sm:gap-4">
            <Link
              href="/"
              className="inline-flex w-full items-center justify-center rounded-xl bg-[#0f6fe8] px-5 py-3 text-sm font-semibold text-white shadow-[0_16px_30px_-15px_rgba(15,111,232,0.8)] transition hover:bg-[#0a57be] sm:w-auto"
            >
              {t("হোমে ফিরে যান", "Back to Home")}
            </Link>

            <Link
              href="/faq"
              className="inline-flex w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 sm:w-auto"
            >
              {t("FAQ দেখুন", "Visit FAQ")}
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
