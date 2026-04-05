"use client";

import { FormEvent, useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  changeMyPassword,
  deleteMyAccount,
  getMyProfile,
  refreshAccessToken,
  updateMyProfile,
} from "@/lib/api/auth";
import { ApiError, type UserProfile } from "@/lib/api/types";
import {
  clearTokens,
  getAccessToken,
  getRefreshToken,
  setTokens,
} from "@/lib/auth/token-store";
import { AuthFeedback } from "@/components/auth/auth-feedback";

type ActiveModal = "update" | "password" | "delete" | null;

type UpdateForm = {
  first_name: string;
  last_name: string;
  email: string;
  birth_date: string;
  gender: string;
  image: File | null;
};

function FieldIcon({ kind }: { kind: "id" | "email" | "name" | "gender" | "birth" | "verified" }) {
  if (kind === "id") {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.8" />
        <path d="M7 10h6M7 14h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }

  if (kind === "email") {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.8" />
        <path d="M4.5 7.5L12 13l7.5-5.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }

  if (kind === "name") {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.8" />
        <path d="M5 19c1.8-3.2 4.2-4.8 7-4.8s5.2 1.6 7 4.8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }

  if (kind === "gender") {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="10" cy="14" r="4" stroke="currentColor" strokeWidth="1.8" />
        <path d="M14 10l5-5M15.5 5H19v3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  if (kind === "birth") {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="4" y="5" width="16" height="15" rx="2" stroke="currentColor" strokeWidth="1.8" />
        <path d="M8 3.5v3M16 3.5v3M4 9h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8 12.4l2.5 2.5L16 9.8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function ProfilePage() {
  const router = useRouter();

  const shellClass =
    "relative min-h-dvh overflow-hidden bg-gradient-to-br from-[#f8fafd] via-[#eff3f9] to-[#e8eef7] px-4 py-8";
  const overlayClass =
    "pointer-events-none absolute inset-0 opacity-40 [background-image:linear-gradient(to_right,#d8dee8_1px,transparent_1px),linear-gradient(to_bottom,#d8dee8_1px,transparent_1px)] [background-size:32px_32px]";
  const panelClass =
    "relative z-[1] mx-auto w-full max-w-5xl rounded-3xl border border-[#d6dde8] bg-gradient-to-b from-[#ffffff] to-[#f9fbff] p-4 shadow-[0_22px_54px_#1123471f] md:p-7";
  const primaryBtnClass =
    "inline-flex min-h-11 items-center justify-center rounded-xl border border-transparent bg-gradient-to-br from-[#1f4fd7] to-[#173ea8] px-4 py-2 font-semibold text-[#ffffff] transition hover:-translate-y-[1px] hover:shadow-[0_12px_22px_#12295a36]";
  const secondaryBtnClass =
    "inline-flex min-h-11 items-center justify-center rounded-xl border border-transparent bg-gradient-to-br from-[#2f5c7c] to-[#254c67] px-4 py-2 font-semibold text-[#ffffff] transition hover:-translate-y-[1px]";
  const dangerBtnClass =
    "inline-flex min-h-11 items-center justify-center rounded-xl border border-transparent bg-[#b9382c] px-4 py-2 font-semibold text-[#ffffff] transition hover:bg-[#952f25]";
  const ghostBtnClass =
    "inline-flex min-h-11 items-center justify-center rounded-xl border border-[#c7d3e6] bg-[#edf2fa] px-4 py-2 font-semibold text-[#2c4571] transition hover:bg-[#e1e9f6]";
  const labelClass = "mb-1.5 block text-sm font-semibold text-[#1a2437]";
  const inputClass =
    "block min-h-[46px] w-full rounded-xl border border-[#d0d9e8] bg-[#fafcff] px-3.5 py-2.5 text-[0.96rem] text-[#0f172a] outline-none transition focus:border-[#1f4fd7] focus:bg-[#ffffff] focus:shadow-[0_0_0_4px_#1f4fd724]";

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);

  const [activeModal, setActiveModal] = useState<ActiveModal>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const [updateForm, setUpdateForm] = useState<UpdateForm>({
    first_name: "",
    last_name: "",
    email: "",
    birth_date: "",
    gender: "",
    image: null,
  });

  const [passwordForm, setPasswordForm] = useState({
    new_password: "",
    confirm_password: "",
  });

  const [deletePassword, setDeletePassword] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadProfile() {
      const access = getAccessToken();
      const refresh = getRefreshToken();

      if (!access) {
        router.replace("/login");
        return;
      }

      try {
        const users = await getMyProfile(access);
        const me = users[0] || null;

        if (!mounted) return;

        setProfile(me);
        if (me) {
          setUpdateForm({
            first_name: me.first_name || "",
            last_name: me.last_name || "",
            email: me.email || "",
            birth_date: me.birth_date || "",
            gender: me.gender || "",
            image: null,
          });
        }
      } catch (err) {
        const shouldTryRefresh =
          err instanceof ApiError && err.status === 401 && Boolean(refresh);

        if (!shouldTryRefresh) {
          if (!mounted) return;
          setPageError(err instanceof Error ? err.message : "Failed to load profile.");
          return;
        }

        try {
          const refreshed = await refreshAccessToken(refresh as string);
          setTokens(refreshed.access, refresh as string);

          const users = await getMyProfile(refreshed.access);
          const me = users[0] || null;

          if (!mounted) return;

          setProfile(me);
          if (me) {
            setUpdateForm({
              first_name: me.first_name || "",
              last_name: me.last_name || "",
              email: me.email || "",
              birth_date: me.birth_date || "",
              gender: me.gender || "",
              image: null,
            });
          }
        } catch {
          clearTokens();
          router.replace("/login");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadProfile();

    return () => {
      mounted = false;
    };
  }, [router]);

  async function withAccessToken<T>(fn: (token: string) => Promise<T>) {
    const access = getAccessToken();
    const refresh = getRefreshToken();

    if (!access) {
      throw new Error("You are not authenticated. Please log in again.");
    }

    try {
      return await fn(access);
    } catch (err) {
      const shouldTryRefresh =
        err instanceof ApiError && err.status === 401 && Boolean(refresh);

      if (!shouldTryRefresh) throw err;

      const refreshed = await refreshAccessToken(refresh as string);
      setTokens(refreshed.access, refresh as string);
      return fn(refreshed.access);
    }
  }

  function openModal(modal: ActiveModal) {
    setActionError(null);
    setActionSuccess(null);
    setActiveModal(modal);
  }

  function closeModal() {
    if (busy) return;
    setActionError(null);
    setActiveModal(null);
  }

  function logout() {
    clearTokens();
    router.replace("/login");
  }

  async function onUpdateSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!profile) return;

    setBusy(true);
    setActionError(null);

    try {
      await withAccessToken((token) =>
        updateMyProfile(
          profile.id,
          {
            first_name: updateForm.first_name,
            last_name: updateForm.last_name,
            email: updateForm.email,
            birth_date: updateForm.birth_date,
            gender: updateForm.gender,
            image: updateForm.image,
          },
          token,
        ),
      );

      const users = await withAccessToken((token) => getMyProfile(token));
      const me = users[0] || null;
      setProfile(me);
      setActionSuccess("Profile updated successfully.");
      setUpdateForm((prev) => ({ ...prev, image: null }));
      setActiveModal(null);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to update profile.");
    } finally {
      setBusy(false);
    }
  }

  async function onPasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!profile) return;

    if (passwordForm.new_password !== passwordForm.confirm_password) {
      setActionError("Passwords do not match.");
      return;
    }

    setBusy(true);
    setActionError(null);

    try {
      const response = await withAccessToken((token) =>
        changeMyPassword(profile.id, passwordForm, token),
      );

      setActionSuccess(response.detail || "Password changed successfully.");
      setPasswordForm({ new_password: "", confirm_password: "" });
      setActiveModal(null);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to change password.");
    } finally {
      setBusy(false);
    }
  }

  async function onDeleteSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setBusy(true);
    setActionError(null);

    try {
      await withAccessToken((token) => deleteMyAccount({ password: deletePassword }, token));
      clearTokens();
      router.replace("/signup");
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to delete account.");
    } finally {
      setBusy(false);
    }
  }

  const displayName = profile
    ? `${profile.first_name || ""} ${profile.last_name || ""}`.trim() || profile.username
    : "My Profile";

  if (loading) {
    return (
      <main className={shellClass}>
        <div className={overlayClass} />
        <section className={panelClass}>
          <p className="m-0 font-semibold text-[#0f172a]">Loading profile...</p>
        </section>
      </main>
    );
  }

  if (pageError) {
    return (
      <main className={shellClass}>
        <div className={overlayClass} />
        <section className={panelClass}>
          <h1 className="m-0 text-[clamp(1.35rem,2.4vw,1.95rem)] font-bold leading-tight text-[#0b1220]">Profile unavailable</h1>
          <p className="mt-2 text-[#526079]">{pageError}</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <button type="button" onClick={logout} className={ghostBtnClass}>Log out</button>
          </div>
        </section>
      </main>
    );
  }

  if (!profile) {
    return (
      <main className={shellClass}>
        <div className={overlayClass} />
        <section className={panelClass}>
          <p className="m-0 font-semibold text-[#0f172a]">No profile data found.</p>
        </section>
      </main>
    );
  }

  return (
    <main className={shellClass}>
      <div className={overlayClass} />

      <section className={panelClass}>
        <div className="mb-4 h-[130px] rounded-2xl bg-gradient-to-br from-[#294d93] via-[#1d356f] to-[#305c7c]" />

        <header className="mb-4 mt-[-58px] flex flex-col items-start gap-4 md:flex-row md:items-end md:justify-between">
          {profile.image ? (
            <Image
              src={profile.image}
              alt={profile.username}
              width={112}
              height={112}
              className="h-28 w-28 rounded-full border-4 border-[#ffffff] bg-[#eef3f9] object-cover shadow-[0_10px_28px_#13274a33]"
            />
          ) : (
            <div className="grid h-28 w-28 place-items-center rounded-full border-4 border-[#ffffff] bg-gradient-to-br from-[#2a4f99] to-[#1f3a75] text-[1.7rem] font-bold text-[#ffffff] shadow-[0_10px_28px_#13274a33]">
              {displayName[0]?.toUpperCase() || "U"}
            </div>
          )}

          <div>
            <p className="mb-2 inline-block rounded-full border border-[#d4ddea] bg-[#edf2fb] px-3 py-1 text-[0.75rem] font-semibold tracking-[0.045em] text-[#1a3f96]">CityZen</p>
            <h1 className="m-0 text-[clamp(1.35rem,2.4vw,1.95rem)] font-bold leading-tight text-[#0b1220]">{displayName}</h1>
            <p className="mt-1 text-[#526079]">@{profile.username}</p>
          </div>

          <button
            type="button"
            className="inline-flex min-h-10 items-center gap-2 rounded-full border border-[#c8d3e6] bg-[#eef3fa] px-4 py-2 font-bold text-[#2b456d] transition hover:bg-[#e3ebf7]"
            onClick={() => openModal("update")}
          >
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M4 20h4l10-10a2 2 0 10-4-4L4 16v4z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Edit profile
          </button>
        </header>

        {actionSuccess ? <AuthFeedback type="success" message={actionSuccess} /> : null}

        <dl className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="relative rounded-2xl border border-[#d4ddea] bg-gradient-to-b from-[#fbfcff] to-[#f5f8fd] px-4 py-3 pl-12">
            <span className="absolute left-3.5 top-3.5 h-5 w-5 text-[#2b4c8d]"><FieldIcon kind="id" /></span>
            <dt>User ID</dt>
            <dd>{profile.id}</dd>
          </div>
          <div className="relative rounded-2xl border border-[#d4ddea] bg-gradient-to-b from-[#fbfcff] to-[#f5f8fd] px-4 py-3 pl-12">
            <span className="absolute left-3.5 top-3.5 h-5 w-5 text-[#2b4c8d]"><FieldIcon kind="email" /></span>
            <dt>Email</dt>
            <dd>{profile.email || "-"}</dd>
          </div>
          <div className="relative rounded-2xl border border-[#d4ddea] bg-gradient-to-b from-[#fbfcff] to-[#f5f8fd] px-4 py-3 pl-12">
            <span className="absolute left-3.5 top-3.5 h-5 w-5 text-[#2b4c8d]"><FieldIcon kind="name" /></span>
            <dt>First name</dt>
            <dd>{profile.first_name || "-"}</dd>
          </div>
          <div className="relative rounded-2xl border border-[#d4ddea] bg-gradient-to-b from-[#fbfcff] to-[#f5f8fd] px-4 py-3 pl-12">
            <span className="absolute left-3.5 top-3.5 h-5 w-5 text-[#2b4c8d]"><FieldIcon kind="name" /></span>
            <dt>Last name</dt>
            <dd>{profile.last_name || "-"}</dd>
          </div>
          <div className="relative rounded-2xl border border-[#d4ddea] bg-gradient-to-b from-[#fbfcff] to-[#f5f8fd] px-4 py-3 pl-12">
            <span className="absolute left-3.5 top-3.5 h-5 w-5 text-[#2b4c8d]"><FieldIcon kind="gender" /></span>
            <dt>Gender</dt>
            <dd>{profile.gender || "-"}</dd>
          </div>
          <div className="relative rounded-2xl border border-[#d4ddea] bg-gradient-to-b from-[#fbfcff] to-[#f5f8fd] px-4 py-3 pl-12">
            <span className="absolute left-3.5 top-3.5 h-5 w-5 text-[#2b4c8d]"><FieldIcon kind="birth" /></span>
            <dt>Birth date</dt>
            <dd>{profile.birth_date || "-"}</dd>
          </div>
          <div className="relative rounded-2xl border border-[#d4ddea] bg-gradient-to-b from-[#fbfcff] to-[#f5f8fd] px-4 py-3 pl-12">
            <span className="absolute left-3.5 top-3.5 h-5 w-5 text-[#2b4c8d]"><FieldIcon kind="verified" /></span>
            <dt>Verified</dt>
            <dd>{profile.is_verified ? "Yes" : "No"}</dd>
          </div>
        </dl>

        <div className="mt-4 flex flex-wrap gap-3">
          <button type="button" className={primaryBtnClass} onClick={() => openModal("update")}>Update profile</button>
          <button type="button" className={secondaryBtnClass} onClick={() => openModal("password")}>Change password</button>
          <button type="button" className={dangerBtnClass} onClick={() => openModal("delete")}>Delete account</button>
          <button type="button" className={ghostBtnClass} onClick={logout}>Log out</button>
        </div>
      </section>

      {activeModal ? (
        <div
          className="fixed inset-0 z-[5000] grid place-items-center bg-[#111d356b] p-4 backdrop-blur-[3px]"
          role="dialog"
          aria-modal="true"
        >
          <section className="relative z-[5001] w-full max-w-[620px] rounded-[20px] border border-[#d2dbe9] bg-gradient-to-b from-[#ffffff] to-[#f8fbff] p-4 shadow-[0_30px_64px_#12234533] md:p-5">
            <header className="mb-3 flex items-center justify-between gap-3">
              <h2>
                {activeModal === "update" ? "Update profile" : ""}
                {activeModal === "password" ? "Change password" : ""}
                {activeModal === "delete" ? "Delete account" : ""}
              </h2>
              <button
                type="button"
                className="inline-flex min-h-[38px] items-center justify-center rounded-xl border border-[#c7d3e6] bg-[#edf2fa] px-3 py-1.5 font-semibold text-[#2b456f]"
                onClick={closeModal}
                disabled={busy}
              >
                Close
              </button>
            </header>

            {actionError ? <AuthFeedback type="error" message={actionError} /> : null}

            {activeModal === "update" ? (
              <form className="grid gap-3.5" onSubmit={onUpdateSubmit}>
                <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
                  <div>
                    <label htmlFor="first_name" className={labelClass}>First name</label>
                    <input
                      id="first_name"
                      className={inputClass}
                      value={updateForm.first_name}
                      onChange={(event) =>
                        setUpdateForm((prev) => ({ ...prev, first_name: event.target.value }))
                      }
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="last_name" className={labelClass}>Last name</label>
                    <input
                      id="last_name"
                      className={inputClass}
                      value={updateForm.last_name}
                      onChange={(event) =>
                        setUpdateForm((prev) => ({ ...prev, last_name: event.target.value }))
                      }
                    />
                  </div>
                </div>

                <label htmlFor="email" className={labelClass}>Email</label>
                <input
                  id="email"
                  type="email"
                  className={inputClass}
                  value={updateForm.email}
                  onChange={(event) =>
                    setUpdateForm((prev) => ({ ...prev, email: event.target.value }))
                  }
                  required
                />

                <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
                  <div>
                    <label htmlFor="birth_date" className={labelClass}>Birth date</label>
                    <input
                      id="birth_date"
                      type="date"
                      className={inputClass}
                      value={updateForm.birth_date}
                      onChange={(event) =>
                        setUpdateForm((prev) => ({ ...prev, birth_date: event.target.value }))
                      }
                    />
                  </div>
                  <div>
                    <label htmlFor="gender" className={labelClass}>Gender</label>
                    <select
                      id="gender"
                      className={inputClass}
                      value={updateForm.gender}
                      onChange={(event) =>
                        setUpdateForm((prev) => ({ ...prev, gender: event.target.value }))
                      }
                    >
                      <option value="">Prefer not to say</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>

                <label htmlFor="image" className={labelClass}>Profile image (optional)</label>
                <input
                  id="image"
                  type="file"
                  accept="image/*"
                  className={inputClass}
                  onChange={(event) =>
                    setUpdateForm((prev) => ({
                      ...prev,
                      image: event.target.files?.[0] || null,
                    }))
                  }
                />

                <button type="submit" className={primaryBtnClass} disabled={busy}>
                  {busy ? "Saving..." : "Save changes"}
                </button>
              </form>
            ) : null}

            {activeModal === "password" ? (
              <form className="grid gap-3.5" onSubmit={onPasswordSubmit}>
                <label htmlFor="new_password" className={labelClass}>New password</label>
                <input
                  id="new_password"
                  type="password"
                  className={inputClass}
                  value={passwordForm.new_password}
                  onChange={(event) =>
                    setPasswordForm((prev) => ({ ...prev, new_password: event.target.value }))
                  }
                  required
                />

                <label htmlFor="confirm_password" className={labelClass}>Confirm new password</label>
                <input
                  id="confirm_password"
                  type="password"
                  className={inputClass}
                  value={passwordForm.confirm_password}
                  onChange={(event) =>
                    setPasswordForm((prev) => ({ ...prev, confirm_password: event.target.value }))
                  }
                  required
                />

                <button type="submit" className={primaryBtnClass} disabled={busy}>
                  {busy ? "Updating..." : "Update password"}
                </button>
              </form>
            ) : null}

            {activeModal === "delete" ? (
              <form className="grid gap-3.5" onSubmit={onDeleteSubmit}>
                <p className="m-0 rounded-xl border border-[#f4c8c1] bg-[#fff2ef] p-3 text-[#b9382c]">
                  This action is permanent. Enter your current password to confirm account deletion.
                </p>

                <label htmlFor="delete_password" className={labelClass}>Current password</label>
                <input
                  id="delete_password"
                  type="password"
                  className={inputClass}
                  value={deletePassword}
                  onChange={(event) => setDeletePassword(event.target.value)}
                  required
                />

                <button type="submit" className={dangerBtnClass} disabled={busy}>
                  {busy ? "Deleting..." : "Delete my account"}
                </button>
              </form>
            ) : null}
          </section>
        </div>
      ) : null}
    </main>
  );
}
