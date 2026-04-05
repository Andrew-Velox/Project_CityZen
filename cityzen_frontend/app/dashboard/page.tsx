"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getMyProfile, refreshAccessToken } from "@/lib/api/auth";
import { ApiError, type UserProfile } from "@/lib/api/types";
import {
  clearTokens,
  getAccessToken,
  getRefreshToken,
  setTokens,
} from "@/lib/auth/token-store";

export default function DashboardPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadProfile() {
      const access = getAccessToken();
      const refresh = getRefreshToken();

      if (!access) {
        router.replace("/login");
        return;
      }

      try {
        const users = await getMyProfile(access);
        if (!isMounted) return;
        setProfile(users[0] || null);
      } catch (err) {
        const shouldTryRefresh =
          err instanceof ApiError && err.status === 401 && Boolean(refresh);

        if (!shouldTryRefresh) {
          if (!isMounted) return;
          setError(err instanceof Error ? err.message : "Failed to load profile.");
          return;
        }

        try {
          const refreshed = await refreshAccessToken(refresh as string);
          setTokens(refreshed.access, refresh as string);
          const users = await getMyProfile(refreshed.access);
          if (!isMounted) return;
          setProfile(users[0] || null);
        } catch {
          clearTokens();
          router.replace("/login");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, [router]);

  function logout() {
    clearTokens();
    router.replace("/login");
  }

  if (loading) {
    return (
      <main className="grid min-h-[100dvh] place-items-center bg-[radial-gradient(circle_at_8%_15%,#deebff_0%,#deebff00_45%),radial-gradient(circle_at_95%_5%,#d4e4ff_0%,#d4e4ff00_42%),linear-gradient(145deg,#f8faff_0%,#eef3ff_52%,#e8efff_100%)] px-4 py-8">
        <p>Loading dashboard...</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="grid min-h-[100dvh] place-items-center bg-[radial-gradient(circle_at_8%_15%,#deebff_0%,#deebff00_45%),radial-gradient(circle_at_95%_5%,#d4e4ff_0%,#d4e4ff00_42%),linear-gradient(145deg,#f8faff_0%,#eef3ff_52%,#e8efff_100%)] px-4 py-8">
        <div className="w-[min(860px,96%)] rounded-[22px] border border-[#d9e1ff] bg-white p-[clamp(1.1rem,2.2vw,1.9rem)] shadow-[0_24px_58px_#203a8f1f]">
          <h1>Dashboard unavailable</h1>
          <p>{error}</p>
          <button
            className="inline-flex min-h-12 items-center justify-center rounded-xl border border-transparent bg-[#1d4ed8] px-4 py-2 font-semibold text-white transition hover:-translate-y-px hover:bg-[#1e40af] hover:shadow-[0_10px_20px_#1d4ed833]"
            onClick={logout}
          >
            Back to login
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="grid min-h-[100dvh] place-items-center bg-[radial-gradient(circle_at_8%_15%,#deebff_0%,#deebff00_45%),radial-gradient(circle_at_95%_5%,#d4e4ff_0%,#d4e4ff00_42%),linear-gradient(145deg,#f8faff_0%,#eef3ff_52%,#e8efff_100%)] px-4 py-8">
      <section className="w-[min(860px,96%)] rounded-[22px] border border-[#d9e1ff] bg-white p-[clamp(1.1rem,2.2vw,1.9rem)] shadow-[0_24px_58px_#203a8f1f]">
        <div className="mb-5 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
          <div>
            <p className="inline-block font-mono text-[0.78rem] tracking-[0.05em] text-[#56708d]">Authenticated session</p>
            <h1>
              {profile?.first_name || profile?.username || "CityZen"} dashboard
            </h1>
          </div>
          <div className="flex gap-2.5">
            <button
              className="inline-flex min-h-12 items-center justify-center rounded-xl border border-transparent bg-[#1d4ed8] px-4 py-2 font-semibold text-white transition hover:-translate-y-px hover:bg-[#1e40af] hover:shadow-[0_10px_20px_#1d4ed833]"
              onClick={() => router.push("/profile")}
            >
              Profile
            </button>
            <button
              className="inline-flex min-h-12 items-center justify-center rounded-xl border border-transparent bg-[#1d4ed8] px-4 py-2 font-semibold text-white transition hover:-translate-y-px hover:bg-[#1e40af] hover:shadow-[0_10px_20px_#1d4ed833]"
              onClick={logout}
            >
              Log out
            </button>
          </div>
        </div>

        <dl className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="rounded-xl border border-[#d9e2ff] bg-[#f9fbff] p-3.5">
            <dt className="text-[0.8rem] text-[#54657e]">Username</dt>
            <dd className="mt-1 text-base font-semibold">{profile?.username || "-"}</dd>
          </div>
          <div className="rounded-xl border border-[#d9e2ff] bg-[#f9fbff] p-3.5">
            <dt className="text-[0.8rem] text-[#54657e]">Email</dt>
            <dd className="mt-1 text-base font-semibold">{profile?.email || "-"}</dd>
          </div>
          <div className="rounded-xl border border-[#d9e2ff] bg-[#f9fbff] p-3.5">
            <dt className="text-[0.8rem] text-[#54657e]">First name</dt>
            <dd className="mt-1 text-base font-semibold">{profile?.first_name || "-"}</dd>
          </div>
          <div className="rounded-xl border border-[#d9e2ff] bg-[#f9fbff] p-3.5">
            <dt className="text-[0.8rem] text-[#54657e]">Last name</dt>
            <dd className="mt-1 text-base font-semibold">{profile?.last_name || "-"}</dd>
          </div>
          <div className="rounded-xl border border-[#d9e2ff] bg-[#f9fbff] p-3.5">
            <dt className="text-[0.8rem] text-[#54657e]">Verified</dt>
            <dd className="mt-1 text-base font-semibold">{profile?.is_verified ? "Yes" : "No"}</dd>
          </div>
        </dl>
      </section>
    </main>
  );
}
