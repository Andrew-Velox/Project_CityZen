"use client";

import { FormEvent, useState } from "react";
import { signup } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/types";
import { AuthShell } from "@/components/auth/auth-shell";
import { AuthFeedback } from "@/components/auth/auth-feedback";
import { useLanguage } from "@/components/providers/language-provider";

export default function SignupPage() {
  const { t } = useLanguage();
  const [form, setForm] = useState({
    username: "",
    first_name: "",
    last_name: "",
    email: "",
    password: "",
    confirm_password: "",
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const labelClass = "mb-1.5 block text-sm font-semibold text-[#1a2437]";
  const inputClass =
    "block min-h-12 w-full rounded-xl border border-[#d0d9e8] bg-[#fafcff] px-3.5 py-2.5 text-[0.96rem] text-[#0f172a] outline-none transition focus:border-[#1f4fd7] focus:bg-[#ffffff] focus:shadow-[0_0_0_4px_#1f4fd724]";
  const buttonClass =
    "inline-flex min-h-12 w-full items-center justify-center rounded-xl border border-transparent bg-gradient-to-br from-[#1f4fd7] to-[#173ea8] px-4 py-2 font-semibold text-[#ffffff] transition hover:-translate-y-[1px] hover:shadow-[0_12px_22px_#12295a36] disabled:cursor-not-allowed disabled:opacity-70 disabled:shadow-none";

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setIsLoading(true);

    try {
      const response = await signup(form);
      setSuccess(response.message || t("রেজিস্ট্রেশন সম্পন্ন। অনুগ্রহ করে ইমেইল চেক করুন।", "Registration complete. Please check your email."));
      setForm({
        username: "",
        first_name: "",
        last_name: "",
        email: "",
        password: "",
        confirm_password: "",
      });
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message || t("রেজিস্ট্রেশন ব্যর্থ হয়েছে।", "Registration failed."));
      } else {
        setError(t("অ্যাকাউন্ট তৈরির সময় অপ্রত্যাশিত ত্রুটি হয়েছে।", "Unexpected error while creating account."));
      }
    } finally {
      setIsLoading(false);
    }
  }

  function updateField(name: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  return (
    <AuthShell
      title={t("আপনার অ্যাকাউন্ট তৈরি করুন", "Create your account")}
      subtitle={t("CityZen-এ যোগ দিন এবং আপনার শহরের তথ্য ব্যবস্থাপনা শুরু করুন।", "Join CityZen and start managing your urban insights.")}
      footerText={t("ইতিমধ্যে রেজিস্টার করেছেন?", "Already registered?")}
      footerCtaLabel={t("লগইন", "Sign in")}
      footerHref="/login"
    >
      <form className="grid gap-4" onSubmit={onSubmit}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label htmlFor="first_name" className={labelClass}>{t("নামের প্রথম অংশ", "First name")}</label>
            <input
              id="first_name"
              name="first_name"
              className={inputClass}
              autoComplete="given-name"
              value={form.first_name}
              onChange={(event) => updateField("first_name", event.target.value)}
              required
            />
          </div>

          <div>
            <label htmlFor="last_name" className={labelClass}>{t("নামের শেষ অংশ", "Last name")}</label>
            <input
              id="last_name"
              name="last_name"
              className={inputClass}
              autoComplete="family-name"
              value={form.last_name}
              onChange={(event) => updateField("last_name", event.target.value)}
            />
          </div>
        </div>

        <label htmlFor="username" className={labelClass}>{t("ইউজারনেম", "Username")}</label>
        <input
          id="username"
          name="username"
          className={inputClass}
          autoComplete="username"
          value={form.username}
          onChange={(event) => updateField("username", event.target.value)}
          required
        />

        <label htmlFor="email" className={labelClass}>{t("ইমেইল", "Email")}</label>
        <input
          id="email"
          name="email"
          type="email"
          className={inputClass}
          autoComplete="email"
          value={form.email}
          onChange={(event) => updateField("email", event.target.value)}
          required
        />

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label htmlFor="password" className={labelClass}>{t("পাসওয়ার্ড", "Password")}</label>
            <input
              id="password"
              name="password"
              type="password"
              className={inputClass}
              autoComplete="new-password"
              value={form.password}
              onChange={(event) => updateField("password", event.target.value)}
              required
            />
          </div>

          <div>
            <label htmlFor="confirm_password" className={labelClass}>{t("পাসওয়ার্ড নিশ্চিত করুন", "Confirm password")}</label>
            <input
              id="confirm_password"
              name="confirm_password"
              type="password"
              className={inputClass}
              autoComplete="new-password"
              value={form.confirm_password}
              onChange={(event) => updateField("confirm_password", event.target.value)}
              required
            />
          </div>
        </div>

        {error ? <AuthFeedback type="error" message={error} /> : null}
        {success ? <AuthFeedback type="success" message={success} /> : null}

        <button type="submit" disabled={isLoading} className={buttonClass}>
          {isLoading ? t("অ্যাকাউন্ট তৈরি হচ্ছে...", "Creating account...") : t("অ্যাকাউন্ট তৈরি করুন", "Create account")}
        </button>
      </form>
    </AuthShell>
  );
}
