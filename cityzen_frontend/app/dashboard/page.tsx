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
      <main className="dashboard-shell">
        <p>Loading dashboard...</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="dashboard-shell">
        <div className="dashboard-card">
          <h1>Dashboard unavailable</h1>
          <p>{error}</p>
          <button onClick={logout}>Back to login</button>
        </div>
      </main>
    );
  }

  return (
    <main className="dashboard-shell">
      <section className="dashboard-card">
        <div className="dashboard-header">
          <div>
            <p className="dashboard-label">Authenticated session</p>
            <h1>
              {profile?.first_name || profile?.username || "CityZen"} dashboard
            </h1>
          </div>
          <div className="dashboard-actions">
            <button onClick={() => router.push("/profile")}>Profile</button>
            <button onClick={logout}>Log out</button>
          </div>
        </div>

        <dl className="dashboard-grid">
          <div>
            <dt>Username</dt>
            <dd>{profile?.username || "-"}</dd>
          </div>
          <div>
            <dt>Email</dt>
            <dd>{profile?.email || "-"}</dd>
          </div>
          <div>
            <dt>First name</dt>
            <dd>{profile?.first_name || "-"}</dd>
          </div>
          <div>
            <dt>Last name</dt>
            <dd>{profile?.last_name || "-"}</dd>
          </div>
          <div>
            <dt>Verified</dt>
            <dd>{profile?.is_verified ? "Yes" : "No"}</dd>
          </div>
        </dl>
      </section>
    </main>
  );
}
