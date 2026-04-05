"use client";

import { FormEvent, useEffect, useState } from "react";
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
      <main className="profile-theme-shell">
        <div className="auth-grid-overlay" />
        <section className="profile-theme-card profile-panel relative z-[1]">
          <p className="profile-strong">Loading profile...</p>
        </section>
      </main>
    );
  }

  if (pageError) {
    return (
      <main className="profile-theme-shell">
        <div className="auth-grid-overlay" />
        <section className="profile-theme-card profile-panel relative z-[1]">
          <h1 className="profile-title">Profile unavailable</h1>
          <p className="profile-muted">{pageError}</p>
          <div className="profile-actions">
            <button type="button" onClick={logout}>Log out</button>
          </div>
        </section>
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="profile-theme-shell">
        <div className="auth-grid-overlay" />
        <section className="profile-theme-card profile-panel relative z-[1]">
          <p className="profile-strong">No profile data found.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="profile-theme-shell">
      <div className="auth-grid-overlay" />

      <section className="profile-theme-card profile-panel relative z-[1]">
        <div className="profile-hero" />

        <header className="profile-header-core">
          {profile.image ? (
            <img src={profile.image} alt={profile.username} className="profile-avatar" />
          ) : (
            <div className="profile-avatar profile-avatar-fallback">
              {displayName[0]?.toUpperCase() || "U"}
            </div>
          )}

          <div>
            <p className="auth-badge">CityZen</p>
            <h1 className="profile-title">{displayName}</h1>
            <p className="profile-muted">@{profile.username}</p>
          </div>

          <button type="button" className="profile-quick-edit" onClick={() => openModal("update")}>
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M4 20h4l10-10a2 2 0 10-4-4L4 16v4z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Edit profile
          </button>
        </header>

        {actionSuccess ? <AuthFeedback type="success" message={actionSuccess} /> : null}

        <dl className="dashboard-grid">
          <div className="profile-item">
            <span className="profile-item-icon"><FieldIcon kind="id" /></span>
            <dt>User ID</dt>
            <dd>{profile.id}</dd>
          </div>
          <div className="profile-item">
            <span className="profile-item-icon"><FieldIcon kind="email" /></span>
            <dt>Email</dt>
            <dd>{profile.email || "-"}</dd>
          </div>
          <div className="profile-item">
            <span className="profile-item-icon"><FieldIcon kind="name" /></span>
            <dt>First name</dt>
            <dd>{profile.first_name || "-"}</dd>
          </div>
          <div className="profile-item">
            <span className="profile-item-icon"><FieldIcon kind="name" /></span>
            <dt>Last name</dt>
            <dd>{profile.last_name || "-"}</dd>
          </div>
          <div className="profile-item">
            <span className="profile-item-icon"><FieldIcon kind="gender" /></span>
            <dt>Gender</dt>
            <dd>{profile.gender || "-"}</dd>
          </div>
          <div className="profile-item">
            <span className="profile-item-icon"><FieldIcon kind="birth" /></span>
            <dt>Birth date</dt>
            <dd>{profile.birth_date || "-"}</dd>
          </div>
          <div className="profile-item">
            <span className="profile-item-icon"><FieldIcon kind="verified" /></span>
            <dt>Verified</dt>
            <dd>{profile.is_verified ? "Yes" : "No"}</dd>
          </div>
        </dl>

        <div className="profile-actions">
          <button type="button" className="profile-cta" onClick={() => openModal("update")}>Update profile</button>
          <button type="button" className="profile-cta profile-cta-secondary" onClick={() => openModal("password")}>Change password</button>
          <button type="button" className="profile-cta profile-cta-danger" onClick={() => openModal("delete")}>Delete account</button>
          <button type="button" className="profile-cta profile-cta-ghost" onClick={logout}>Log out</button>
        </div>
      </section>

      {activeModal ? (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <section className="modal-card">
            <header className="modal-header">
              <h2>
                {activeModal === "update" ? "Update profile" : ""}
                {activeModal === "password" ? "Change password" : ""}
                {activeModal === "delete" ? "Delete account" : ""}
              </h2>
              <button type="button" className="close-btn" onClick={closeModal} disabled={busy}>Close</button>
            </header>

            {actionError ? <AuthFeedback type="error" message={actionError} /> : null}

            {activeModal === "update" ? (
              <form className="modal-form" onSubmit={onUpdateSubmit}>
                <div className="modal-row">
                  <div>
                    <label htmlFor="first_name">First name</label>
                    <input
                      id="first_name"
                      value={updateForm.first_name}
                      onChange={(event) =>
                        setUpdateForm((prev) => ({ ...prev, first_name: event.target.value }))
                      }
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="last_name">Last name</label>
                    <input
                      id="last_name"
                      value={updateForm.last_name}
                      onChange={(event) =>
                        setUpdateForm((prev) => ({ ...prev, last_name: event.target.value }))
                      }
                    />
                  </div>
                </div>

                <label htmlFor="email">Email</label>
                <input
                  id="email"
                  type="email"
                  value={updateForm.email}
                  onChange={(event) =>
                    setUpdateForm((prev) => ({ ...prev, email: event.target.value }))
                  }
                  required
                />

                <div className="modal-row">
                  <div>
                    <label htmlFor="birth_date">Birth date</label>
                    <input
                      id="birth_date"
                      type="date"
                      value={updateForm.birth_date}
                      onChange={(event) =>
                        setUpdateForm((prev) => ({ ...prev, birth_date: event.target.value }))
                      }
                    />
                  </div>
                  <div>
                    <label htmlFor="gender">Gender</label>
                    <select
                      id="gender"
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

                <label htmlFor="image">Profile image (optional)</label>
                <input
                  id="image"
                  type="file"
                  accept="image/*"
                  onChange={(event) =>
                    setUpdateForm((prev) => ({
                      ...prev,
                      image: event.target.files?.[0] || null,
                    }))
                  }
                />

                <button type="submit" disabled={busy}>
                  {busy ? "Saving..." : "Save changes"}
                </button>
              </form>
            ) : null}

            {activeModal === "password" ? (
              <form className="modal-form" onSubmit={onPasswordSubmit}>
                <label htmlFor="new_password">New password</label>
                <input
                  id="new_password"
                  type="password"
                  value={passwordForm.new_password}
                  onChange={(event) =>
                    setPasswordForm((prev) => ({ ...prev, new_password: event.target.value }))
                  }
                  required
                />

                <label htmlFor="confirm_password">Confirm new password</label>
                <input
                  id="confirm_password"
                  type="password"
                  value={passwordForm.confirm_password}
                  onChange={(event) =>
                    setPasswordForm((prev) => ({ ...prev, confirm_password: event.target.value }))
                  }
                  required
                />

                <button type="submit" disabled={busy}>
                  {busy ? "Updating..." : "Update password"}
                </button>
              </form>
            ) : null}

            {activeModal === "delete" ? (
              <form className="modal-form" onSubmit={onDeleteSubmit}>
                <p className="modal-warning">
                  This action is permanent. Enter your current password to confirm account deletion.
                </p>

                <label htmlFor="delete_password">Current password</label>
                <input
                  id="delete_password"
                  type="password"
                  value={deletePassword}
                  onChange={(event) => setDeletePassword(event.target.value)}
                  required
                />

                <button type="submit" className="danger-btn" disabled={busy}>
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
