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
import { deleteReport, getReportsByUser, updateReport } from "@/lib/api/report";
import { ApiError, type Report, type UserProfile } from "@/lib/api/types";
import {
  clearTokens,
  getAccessToken,
  getRefreshToken,
  setTokens,
} from "@/lib/auth/token-store";
import { AuthFeedback } from "@/components/auth/auth-feedback";
import ReportEditModal, { type ReportEditSubmitPayload } from "@/components/report/report-edit-modal";

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
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="w-5 h-5">
        <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.8" />
        <path d="M7 10h6M7 14h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }

  if (kind === "email") {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="w-5 h-5">
        <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.8" />
        <path d="M4.5 7.5L12 13l7.5-5.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }

  if (kind === "name") {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="w-5 h-5">
        <circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.8" />
        <path d="M5 19c1.8-3.2 4.2-4.8 7-4.8s5.2 1.6 7 4.8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }

  if (kind === "gender") {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="w-5 h-5">
        <circle cx="10" cy="14" r="4" stroke="currentColor" strokeWidth="1.8" />
        <path d="M14 10l5-5M15.5 5H19v3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  if (kind === "birth") {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="w-5 h-5">
        <rect x="4" y="5" width="16" height="15" rx="2" stroke="currentColor" strokeWidth="1.8" />
        <path d="M8 3.5v3M16 3.5v3M4 9h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="w-5 h-5">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8 12.4l2.5 2.5L16 9.8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function ProfilePage() {
  const router = useRouter();

  // Modernized Class Variables
  const shellClass = "min-h-screen px-4 py-8 sm:px-6 lg:px-8 relative overflow-hidden";
  const panelClass = "relative z-10 mx-auto w-full max-w-4xl rounded-3xl bg-white shadow-xl ring-1 ring-slate-200 overflow-hidden";
  
  const primaryBtnClass = "inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50";
  const secondaryBtnClass = "inline-flex items-center justify-center rounded-xl bg-slate-800 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-800 focus:ring-offset-2 disabled:opacity-50";
  const dangerBtnClass = "inline-flex items-center justify-center rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-offset-2 disabled:opacity-50";
  const ghostBtnClass = "inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 disabled:opacity-50";
  
  const labelClass = "mb-1.5 block text-sm font-medium text-slate-700";
  const inputClass = "block w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-slate-900 placeholder-slate-400 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 sm:text-sm";

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [myReports, setMyReports] = useState<Report[]>([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [reportsError, setReportsError] = useState<string | null>(null);
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
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [reportBusy, setReportBusy] = useState(false);
  const [reportActionError, setReportActionError] = useState<string | null>(null);

  async function loadMyReports(userId: number) {
    setReportsLoading(true);
    setReportsError(null);

    try {
      const reports = await getReportsByUser(userId);
      setMyReports(reports);
    } catch (err) {
      setReportsError(err instanceof Error ? err.message : "Failed to load your reports.");
    } finally {
      setReportsLoading(false);
    }
  }

  function openReportModal(report: Report) {
    setSelectedReport(report);
    setReportActionError(null);
    setIsReportModalOpen(true);
  }

  function closeReportModal() {
    if (reportBusy) return;
    setIsReportModalOpen(false);
    setSelectedReport(null);
    setReportActionError(null);
  }

  async function onReportUpdateSubmit(payload: ReportEditSubmitPayload) {
    if (!profile || !selectedReport) return;

    setReportBusy(true);
    setReportActionError(null);

    try {
      await withAccessToken((token) =>
        updateReport(
          selectedReport.id,
          {
            title: payload.title,
            description: payload.description,
            category: payload.category,
            area: payload.area,
            location: payload.location,
            files: payload.files,
            image_slots: payload.image_slots,
          },
          token,
        ),
      );

      await loadMyReports(profile.id);
      setActionSuccess("Report updated successfully.");
      closeReportModal();
    } catch (err) {
      setReportActionError(err instanceof Error ? err.message : "Failed to update report.");
    } finally {
      setReportBusy(false);
    }
  }

  async function onReportDelete() {
    if (!profile || !selectedReport) return;

    setReportBusy(true);
    setReportActionError(null);

    try {
      await withAccessToken((token) => deleteReport(selectedReport.id, token));
      await loadMyReports(profile.id);
      setActionSuccess("Report deleted successfully.");
      closeReportModal();
    } catch (err) {
      setReportActionError(err instanceof Error ? err.message : "Failed to delete report.");
    } finally {
      setReportBusy(false);
    }
  }

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

          await loadMyReports(me.id);
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

            await loadMyReports(me.id);
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

  function prettyDate(dateValue: string) {
    try {
      return new Date(dateValue).toLocaleDateString();
    } catch {
      return dateValue;
    }
  }

  function prettyLabel(value: string) {
    return value.replace(/_/g, " ").replace(/^\w/, (char) => char.toUpperCase());
  }

  if (loading) {
    return (
      <main className={shellClass}>
        <section className={`${panelClass} p-8 flex items-center justify-center min-h-[400px]`}>
          <div className="flex flex-col items-center gap-3 text-slate-500">
             <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />
             <p className="font-medium">Loading profile...</p>
          </div>
        </section>
      </main>
    );
  }

  if (pageError) {
    return (
      <main className={shellClass}>
        <section className={`${panelClass} p-8 text-center`}>
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
            <svg className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Profile unavailable</h1>
          <p className="mt-2 text-slate-500">{pageError}</p>
          <div className="mt-6 flex justify-center">
            <button type="button" onClick={logout} className={ghostBtnClass}>Log out</button>
          </div>
        </section>
      </main>
    );
  }

  if (!profile) {
    return (
      <main className={shellClass}>
        <section className={`${panelClass} p-8`}>
          <p className="font-medium text-slate-600">No profile data found.</p>
        </section>
      </main>
    );
  }

  return (
    <main className={shellClass}>
      <section className={panelClass}>
        {/* Banner Area */}
        <div className="h-32 w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600" />

        <div className="px-6 pb-8 sm:px-8">
          <header className="-mt-12 mb-8 flex flex-col items-start gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex flex-col sm:flex-row sm:items-end gap-5">
              {profile.image ? (
                <Image
                  src={profile.image}
                  alt={profile.username}
                  width={112}
                  height={112}
                  loading="eager"
                  className="h-28 w-28 rounded-full border-4 border-white bg-slate-100 object-cover shadow-md"
                />
              ) : (
                <div className="flex h-28 w-28 items-center justify-center rounded-full border-4 border-white bg-slate-200 text-4xl font-bold text-slate-500 shadow-md">
                  {displayName[0]?.toUpperCase() || "U"}
                </div>
              )}

              <div className="mb-1">
                <span className="mb-2 inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700 ring-1 ring-inset ring-blue-700/10">
                  CityZen
                </span>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{displayName}</h1>
                <p className="text-sm font-medium text-slate-500">@{profile.username}</p>
              </div>
            </div>

            <button
              type="button"
              className={ghostBtnClass}
              onClick={() => openModal("update")}
            >
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="mr-2 h-4 w-4">
                <path d="M4 20h4l10-10a2 2 0 10-4-4L4 16v4z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Edit Profile
            </button>
          </header>

          {actionSuccess ? (
            <div className="mb-6">
              <AuthFeedback type="success" message={actionSuccess} />
            </div>
          ) : null}

          {/* Details Grid */}
          <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 transition-colors hover:bg-slate-100">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                <FieldIcon kind="id" />
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">User ID</dt>
                <dd className="mt-0.5 text-sm font-semibold text-slate-900">{profile.id}</dd>
              </div>
            </div>

            <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 transition-colors hover:bg-slate-100">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
                <FieldIcon kind="email" />
              </div>
              <div className="overflow-hidden">
                <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">Email</dt>
                <dd className="mt-0.5 truncate text-sm font-semibold text-slate-900">{profile.email || "-"}</dd>
              </div>
            </div>

            <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 transition-colors hover:bg-slate-100">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                <FieldIcon kind="name" />
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">First Name</dt>
                <dd className="mt-0.5 text-sm font-semibold text-slate-900">{profile.first_name || "-"}</dd>
              </div>
            </div>

            <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 transition-colors hover:bg-slate-100">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-teal-100 text-teal-600">
                <FieldIcon kind="name" />
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">Last Name</dt>
                <dd className="mt-0.5 text-sm font-semibold text-slate-900">{profile.last_name || "-"}</dd>
              </div>
            </div>

            <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 transition-colors hover:bg-slate-100">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-purple-100 text-purple-600">
                <FieldIcon kind="gender" />
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">Gender</dt>
                <dd className="mt-0.5 text-sm font-semibold text-slate-900 capitalize">{profile.gender || "-"}</dd>
              </div>
            </div>

            <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 transition-colors hover:bg-slate-100">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                <FieldIcon kind="birth" />
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">Birth Date</dt>
                <dd className="mt-0.5 text-sm font-semibold text-slate-900">{profile.birth_date || "-"}</dd>
              </div>
            </div>
            
            <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 transition-colors hover:bg-slate-100">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-600">
                <FieldIcon kind="verified" />
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">Status</dt>
                <dd className="mt-0.5 text-sm font-semibold text-slate-900">{profile.is_verified ? "Verified" : "Unverified"}</dd>
              </div>
            </div>
          </div>

          <section className="mb-8 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-slate-900">My Reports</h2>
              <span className="rounded-full bg-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700">
                {myReports.length}
              </span>
            </div>

            {reportsLoading ? (
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600" />
                Loading your reports...
              </div>
            ) : null}

            {!reportsLoading && reportsError ? (
              <p className="text-sm font-medium text-red-600">{reportsError}</p>
            ) : null}

            {!reportsLoading && !reportsError && myReports.length === 0 ? (
              <p className="text-sm text-slate-500">You have not submitted any reports yet.</p>
            ) : null}

            {!reportsLoading && !reportsError && myReports.length > 0 ? (
              <ul className="space-y-3">
                {myReports.map((report) => (
                  <li key={report.id}>
                    <button
                      type="button"
                      onClick={() => openReportModal(report)}
                      className="w-full rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-blue-200 hover:bg-blue-50/30"
                    >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <h3 className="text-sm font-semibold text-slate-900">{report.title}</h3>
                        <p className="mt-1 text-sm text-slate-600">{report.description}</p>
                      </div>
                      <div className="flex gap-2">
                        <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-700">
                          {prettyLabel(report.category)}
                        </span>
                        <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">
                          {prettyLabel(report.status)}
                        </span>
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-1 gap-2 text-xs text-slate-500 sm:grid-cols-3">
                      <p><span className="font-semibold text-slate-700">Area:</span> {report.area}</p>
                      <p><span className="font-semibold text-slate-700">Location:</span> {report.location}</p>
                      <p><span className="font-semibold text-slate-700">Created:</span> {prettyDate(report.created_at)}</p>
                    </div>
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </section>

          <div className="flex flex-wrap gap-3 border-t border-slate-200 pt-6">
            <button type="button" className={primaryBtnClass} onClick={() => openModal("update")}>Update Profile</button>
            <button type="button" className={secondaryBtnClass} onClick={() => openModal("password")}>Change Password</button>
            <button type="button" className={ghostBtnClass} onClick={logout}>Log Out</button>
            <div className="flex-1" /> {/* Spacer */}
            <button type="button" className={dangerBtnClass} onClick={() => openModal("delete")}>Delete Account</button>
          </div>
        </div>
      </section>

      {/* Modals */}
      {activeModal ? (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm transition-opacity"
          role="dialog"
          aria-modal="true"
        >
          <section className="relative w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl ring-1 ring-slate-200 sm:p-8">
            <header className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">
                {activeModal === "update" ? "Update Profile" : ""}
                {activeModal === "password" ? "Change Password" : ""}
                {activeModal === "delete" ? "Delete Account" : ""}
              </h2>
              <button
                type="button"
                className="rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-500"
                onClick={closeModal}
                disabled={busy}
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </header>

            {actionError ? (
               <div className="mb-5">
                 <AuthFeedback type="error" message={actionError} />
               </div>
            ) : null}

            {activeModal === "update" ? (
              <form className="flex flex-col gap-5" onSubmit={onUpdateSubmit}>
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <div>
                    <label htmlFor="first_name" className={labelClass}>First name</label>
                    <input
                      id="first_name"
                      className={inputClass}
                      value={updateForm.first_name}
                      onChange={(event) => setUpdateForm((prev) => ({ ...prev, first_name: event.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="last_name" className={labelClass}>Last name</label>
                    <input
                      id="last_name"
                      className={inputClass}
                      value={updateForm.last_name}
                      onChange={(event) => setUpdateForm((prev) => ({ ...prev, last_name: event.target.value }))}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="email" className={labelClass}>Email</label>
                  <input
                    id="email"
                    type="email"
                    className={inputClass}
                    value={updateForm.email}
                    onChange={(event) => setUpdateForm((prev) => ({ ...prev, email: event.target.value }))}
                    required
                  />
                </div>

                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <div>
                    <label htmlFor="birth_date" className={labelClass}>Birth date</label>
                    <input
                      id="birth_date"
                      type="date"
                      className={inputClass}
                      value={updateForm.birth_date}
                      onChange={(event) => setUpdateForm((prev) => ({ ...prev, birth_date: event.target.value }))}
                    />
                  </div>
                  <div>
                    <label htmlFor="gender" className={labelClass}>Gender</label>
                    <select
                      id="gender"
                      className={inputClass}
                      value={updateForm.gender}
                      onChange={(event) => setUpdateForm((prev) => ({ ...prev, gender: event.target.value }))}
                    >
                      <option value="">Prefer not to say</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label htmlFor="image" className={labelClass}>Profile image (optional)</label>
                  <input
                    id="image"
                    type="file"
                    accept="image/*"
                    className="block w-full text-sm text-slate-500 file:mr-4 file:rounded-full file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-blue-700 hover:file:bg-blue-100 focus:outline-none"
                    onChange={(event) => setUpdateForm((prev) => ({ ...prev, image: event.target.files?.[0] || null }))}
                  />
                </div>

                <div className="mt-2 flex justify-end gap-3">
                  <button type="button" className={ghostBtnClass} onClick={closeModal} disabled={busy}>Cancel</button>
                  <button type="submit" className={primaryBtnClass} disabled={busy}>
                    {busy ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </form>
            ) : null}

            {activeModal === "password" ? (
              <form className="flex flex-col gap-5" onSubmit={onPasswordSubmit}>
                <div>
                  <label htmlFor="new_password" className={labelClass}>New password</label>
                  <input
                    id="new_password"
                    type="password"
                    className={inputClass}
                    value={passwordForm.new_password}
                    onChange={(event) => setPasswordForm((prev) => ({ ...prev, new_password: event.target.value }))}
                    required
                  />
                </div>

                <div>
                  <label htmlFor="confirm_password" className={labelClass}>Confirm new password</label>
                  <input
                    id="confirm_password"
                    type="password"
                    className={inputClass}
                    value={passwordForm.confirm_password}
                    onChange={(event) => setPasswordForm((prev) => ({ ...prev, confirm_password: event.target.value }))}
                    required
                  />
                </div>

                <div className="mt-2 flex justify-end gap-3">
                  <button type="button" className={ghostBtnClass} onClick={closeModal} disabled={busy}>Cancel</button>
                  <button type="submit" className={primaryBtnClass} disabled={busy}>
                    {busy ? "Updating..." : "Update Password"}
                  </button>
                </div>
              </form>
            ) : null}

            {activeModal === "delete" ? (
              <form className="flex flex-col gap-5" onSubmit={onDeleteSubmit}>
                <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                  <p className="text-sm text-red-800">
                    <strong>Warning:</strong> This action is permanent and cannot be undone. Enter your current password to confirm account deletion.
                  </p>
                </div>

                <div>
                  <label htmlFor="delete_password" className={labelClass}>Current password</label>
                  <input
                    id="delete_password"
                    type="password"
                    className={inputClass}
                    value={deletePassword}
                    onChange={(event) => setDeletePassword(event.target.value)}
                    required
                  />
                </div>

                <div className="mt-2 flex justify-end gap-3">
                  <button type="button" className={ghostBtnClass} onClick={closeModal} disabled={busy}>Cancel</button>
                  <button type="submit" className={dangerBtnClass} disabled={busy}>
                    {busy ? "Deleting..." : "Permanently Delete Account"}
                  </button>
                </div>
              </form>
            ) : null}
          </section>
        </div>
      ) : null}

      <ReportEditModal
        isOpen={isReportModalOpen}
        busy={reportBusy}
        error={reportActionError}
        report={selectedReport}
        onClose={closeReportModal}
        onSubmit={onReportUpdateSubmit}
        onDelete={onReportDelete}
      />
    </main>
  );
}