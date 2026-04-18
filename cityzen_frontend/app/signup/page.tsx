"use client";

import { FormEvent, useState } from "react";
import { signup } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/types";
import { AuthShell } from "@/components/auth/auth-shell";
import { AuthFeedback } from "@/components/auth/auth-feedback";
import { useLanguage } from "@/components/i18n/language-context";

export default function SignupPage() {
  const { language } = useLanguage();
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

  const text =
    language === "bn"
      ? {
          title: "অ্যাকাউন্ট তৈরি করুন",
          subtitle: "সাইন আপ করে আপনার যাত্রা শুরু করুন",
          footerText: "ইতিমধ্যে অ্যাকাউন্ট আছে?",
          footerCta: "সাইন ইন",
          firstName: "নামের প্রথম অংশ",
          firstNamePlaceholder: "নামের প্রথম অংশ",
          lastName: "নামের শেষ অংশ",
          lastNamePlaceholder: "নামের শেষ অংশ",
          username: "ইউজারনেম",
          usernamePlaceholder: "একটি ইউজারনেম লিখুন",
          email: "ইমেইল",
          emailPlaceholder: "ইমেইল ঠিকানা",
          password: "পাসওয়ার্ড",
          passwordPlaceholder: "পাসওয়ার্ড তৈরি করুন",
          confirmPassword: "পাসওয়ার্ড নিশ্চিত করুন",
          confirmPasswordPlaceholder: "পাসওয়ার্ড নিশ্চিত করুন",
          registrationFailed: "রেজিস্ট্রেশন ব্যর্থ হয়েছে।",
          unexpectedError: "অ্যাকাউন্ট তৈরির সময় অপ্রত্যাশিত ত্রুটি হয়েছে।",
          registrationSuccess: "রেজিস্ট্রেশন সম্পন্ন। আপনার ইমেইল দেখুন।",
          creating: "অ্যাকাউন্ট তৈরি হচ্ছে...",
          createAccount: "অ্যাকাউন্ট তৈরি করুন",
        }
      : {
          title: "Create Account",
          subtitle: "Sign up and start your journey",
          footerText: "Already have an account?",
          footerCta: "Sign in",
          firstName: "First name",
          firstNamePlaceholder: "First name",
          lastName: "Last name",
          lastNamePlaceholder: "Last name",
          username: "Username",
          usernamePlaceholder: "Choose a username",
          email: "Email",
          emailPlaceholder: "Email address",
          password: "Password",
          passwordPlaceholder: "Create password",
          confirmPassword: "Confirm password",
          confirmPasswordPlaceholder: "Confirm password",
          registrationFailed: "Registration failed.",
          unexpectedError: "Unexpected error while creating account.",
          registrationSuccess: "Registration complete. Please check your email.",
          creating: "Creating account...",
          createAccount: "Create account",
        };

  const labelClass = "mb-1.5 block text-sm font-semibold text-[#20543e]";
  const inputClass =
    "block min-h-12 w-full rounded-2xl border border-[#9ce0bd] bg-[#e7f8ef]/70 px-4 py-3 text-[0.96rem] text-[#143625] outline-none transition placeholder:text-[#5c8e73] focus:border-[#2fca7d] focus:bg-[#f8fffb] focus:shadow-[0_0_0_4px_#2fca7d26]";
  const buttonClass =
    "inline-flex min-h-12 w-full items-center justify-center rounded-2xl border border-transparent bg-gradient-to-b from-[#21c86f] to-[#16b861] px-4 py-2 font-semibold text-[#ffffff] transition hover:-translate-y-[1px] hover:shadow-[0_12px_20px_#0d75463b] disabled:cursor-not-allowed disabled:opacity-70 disabled:shadow-none";

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setIsLoading(true);

    try {
      const response = await signup(form);
      setSuccess(response.message || text.registrationSuccess);
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
        setError(err.message || text.registrationFailed);
      } else {
        setError(text.unexpectedError);
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
      title={text.title}
      subtitle={text.subtitle}
      footerText={text.footerText}
      footerCtaLabel={text.footerCta}
      footerHref="/login"
    >
      <form className="grid gap-4" onSubmit={onSubmit}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label htmlFor="first_name" className={labelClass}>{text.firstName}</label>
            <input
              id="first_name"
              name="first_name"
              className={inputClass}
              autoComplete="given-name"
              placeholder={text.firstNamePlaceholder}
              value={form.first_name}
              onChange={(event) => updateField("first_name", event.target.value)}
              required
            />
          </div>

          <div>
            <label htmlFor="last_name" className={labelClass}>{text.lastName}</label>
            <input
              id="last_name"
              name="last_name"
              className={inputClass}
              autoComplete="family-name"
              placeholder={text.lastNamePlaceholder}
              value={form.last_name}
              onChange={(event) => updateField("last_name", event.target.value)}
            />
          </div>
        </div>

        <label htmlFor="username" className={labelClass}>{text.username}</label>
        <input
          id="username"
          name="username"
          className={inputClass}
          autoComplete="username"
          placeholder={text.usernamePlaceholder}
          value={form.username}
          onChange={(event) => updateField("username", event.target.value)}
          required
        />

        <label htmlFor="email" className={labelClass}>{text.email}</label>
        <input
          id="email"
          name="email"
          type="email"
          className={inputClass}
          autoComplete="email"
          placeholder={text.emailPlaceholder}
          value={form.email}
          onChange={(event) => updateField("email", event.target.value)}
          required
        />

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label htmlFor="password" className={labelClass}>{text.password}</label>
            <input
              id="password"
              name="password"
              type="password"
              className={inputClass}
              autoComplete="new-password"
              placeholder={text.passwordPlaceholder}
              value={form.password}
              onChange={(event) => updateField("password", event.target.value)}
              required
            />
          </div>

          <div>
            <label htmlFor="confirm_password" className={labelClass}>{text.confirmPassword}</label>
            <input
              id="confirm_password"
              name="confirm_password"
              type="password"
              className={inputClass}
              autoComplete="new-password"
              placeholder={text.confirmPasswordPlaceholder}
              value={form.confirm_password}
              onChange={(event) => updateField("confirm_password", event.target.value)}
              required
            />
          </div>
        </div>

        {error ? <AuthFeedback type="error" message={error} /> : null}
        {success ? <AuthFeedback type="success" message={success} /> : null}

        <button type="submit" disabled={isLoading} className={buttonClass}>
          {isLoading ? text.creating : text.createAccount}
        </button>
      </form>
    </AuthShell>
  );
}
