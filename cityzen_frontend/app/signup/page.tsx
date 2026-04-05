"use client";

import { FormEvent, useState } from "react";
import { signup } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/types";
import { AuthShell } from "@/components/auth/auth-shell";
import { AuthFeedback } from "@/components/auth/auth-feedback";

export default function SignupPage() {
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

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setIsLoading(true);

    try {
      const response = await signup(form);
      setSuccess(response.message || "Registration complete. Please check your email.");
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
        setError(err.message || "Registration failed.");
      } else {
        setError("Unexpected error while creating account.");
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
      title="Create your account"
      subtitle="Join CityZen and start managing your urban insights."
      footerText="Already registered?"
      footerCtaLabel="Sign in"
      footerHref="/login"
    >
      <form className="auth-form" onSubmit={onSubmit}>
        <div className="auth-row">
          <div>
            <label htmlFor="first_name">First name</label>
            <input
              id="first_name"
              name="first_name"
              autoComplete="given-name"
              value={form.first_name}
              onChange={(event) => updateField("first_name", event.target.value)}
              required
            />
          </div>

          <div>
            <label htmlFor="last_name">Last name</label>
            <input
              id="last_name"
              name="last_name"
              autoComplete="family-name"
              value={form.last_name}
              onChange={(event) => updateField("last_name", event.target.value)}
            />
          </div>
        </div>

        <label htmlFor="username">Username</label>
        <input
          id="username"
          name="username"
          autoComplete="username"
          value={form.username}
          onChange={(event) => updateField("username", event.target.value)}
          required
        />

        <label htmlFor="email">Email</label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          value={form.email}
          onChange={(event) => updateField("email", event.target.value)}
          required
        />

        <div className="auth-row">
          <div>
            <label htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              value={form.password}
              onChange={(event) => updateField("password", event.target.value)}
              required
            />
          </div>

          <div>
            <label htmlFor="confirm_password">Confirm password</label>
            <input
              id="confirm_password"
              name="confirm_password"
              type="password"
              autoComplete="new-password"
              value={form.confirm_password}
              onChange={(event) => updateField("confirm_password", event.target.value)}
              required
            />
          </div>
        </div>

        {error ? <AuthFeedback type="error" message={error} /> : null}
        {success ? <AuthFeedback type="success" message={success} /> : null}

        <button type="submit" disabled={isLoading}>
          {isLoading ? "Creating account..." : "Create account"}
        </button>
      </form>
    </AuthShell>
  );
}
