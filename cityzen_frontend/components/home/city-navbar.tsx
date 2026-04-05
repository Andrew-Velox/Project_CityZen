"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { getMyProfile, refreshAccessToken } from "@/lib/api/auth";
import { clearTokens, getAccessToken, getRefreshToken, setTokens } from "@/lib/auth/token-store";
import { ApiError } from "@/lib/api/types";

type NavbarUser = {
  firstName: string;
  avatar: string | null;
};

export function CityNavbar() {
  const router = useRouter();
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<NavbarUser | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function resolveSession() {
      const access = getAccessToken();
      const refresh = getRefreshToken();

      if (!access) {
        if (!mounted) return;
        setIsLoggedIn(false);
        setUser(null);
        return;
      }

      try {
        const users = await getMyProfile(access);
        const me = users[0] || null;
        if (!mounted) return;

        if (!me) {
          setIsLoggedIn(false);
          setUser(null);
          return;
        }

        setIsLoggedIn(true);
        setUser({
          firstName: me.first_name || me.username,
          avatar: me.image,
        });
      } catch (err) {
        const shouldRefresh =
          err instanceof ApiError && err.status === 401 && Boolean(refresh);

        if (!shouldRefresh) {
          if (!mounted) return;
          setIsLoggedIn(false);
          setUser(null);
          return;
        }

        try {
          const refreshed = await refreshAccessToken(refresh as string);
          setTokens(refreshed.access, refresh as string);
          const users = await getMyProfile(refreshed.access);
          const me = users[0] || null;
          if (!mounted) return;

          if (!me) {
            setIsLoggedIn(false);
            setUser(null);
            return;
          }

          setIsLoggedIn(true);
          setUser({
            firstName: me.first_name || me.username,
            avatar: me.image,
          });
        } catch {
          if (!mounted) return;
          clearTokens();
          setIsLoggedIn(false);
          setUser(null);
        }
      }
    }

    resolveSession();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    function onClickOutside(event: MouseEvent) {
      if (!dropdownRef.current) return;
      if (!dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }

    document.addEventListener("mousedown", onClickOutside);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
    };
  }, []);

  function handleLogout() {
    clearTokens();
    setIsLoggedIn(false);
    setUser(null);
    setIsDropdownOpen(false);
    router.push("/login");
  }

  return (
    <header className="relative z-[2200] w-full shrink-0">
      <nav
        className="relative z-[2201] flex items-center justify-between gap-3 rounded-3xl border border-[#d3dbe8] bg-gradient-to-b from-[#ffffffe0] to-[#f8fbffe0] px-4 py-3 shadow-[0_12px_30px_#1528481d] backdrop-blur-[10px]"
        aria-label="Main navigation"
      >
        <Link href="/" className="inline-flex items-center gap-2 font-extrabold tracking-[0.01em] text-[#0f172a]">
          <span className="h-[10px] w-[10px] rounded-full bg-gradient-to-br from-[#1f4fd7] to-[#2f5c7c]" />
          CityZen
        </Link>

        {!isLoggedIn ? (
          <div className="flex flex-wrap gap-2">
            <Link
              href="/login"
              className="rounded-xl px-3 py-2 font-semibold text-[#334155] transition hover:-translate-y-[1px] hover:bg-[#edf2fb] hover:text-[#233e7f]"
            >
              Login
            </Link>
            <Link
              href="/signup"
              className="rounded-xl bg-gradient-to-br from-[#1f4fd7] to-[#173ea8] px-3 py-2 font-semibold text-[#ffffff] transition hover:-translate-y-[1px] hover:shadow-[0_10px_20px_#12295a36]"
            >
              Sign up
            </Link>
          </div>
        ) : (
          <div className="relative z-[2202] flex items-center justify-end gap-3" ref={dropdownRef}>
            <p className="text-[0.94rem] font-semibold text-[#243147]">Welcome, {user?.firstName || "User"}</p>

            <button
              type="button"
              className="inline-flex min-h-[42px] items-center gap-2 rounded-full border border-[#ccd6e7] bg-gradient-to-br from-[#f5f8fd] to-[#edf2fa] px-2.5 py-1.5 shadow-[0_6px_14px_#14284d17] transition hover:-translate-y-[1px] hover:shadow-[0_10px_20px_#14284d21]"
              onClick={() => setIsDropdownOpen((prev) => !prev)}
              aria-expanded={isDropdownOpen}
              aria-haspopup="menu"
            >
              {user?.avatar ? (
                <Image
                  src={user.avatar}
                  alt="Profile"
                  width={30}
                  height={30}
                  className="h-[31px] w-[31px] rounded-full border border-[#d3ddf6] object-cover"
                />
              ) : (
                <span className="grid h-[31px] w-[31px] place-items-center rounded-full bg-gradient-to-br from-[#2a4f99] to-[#1f3a75] text-[0.82rem] font-bold text-[#ffffff]">
                  {(user?.firstName || "U").charAt(0).toUpperCase()}
                </span>
              )}
              <span className="text-[0.9rem] leading-none text-[#2b3f66]">▾</span>
            </button>

            {isDropdownOpen ? (
              <div
                className="absolute right-0 top-[calc(100%+0.6rem)] z-[3000] min-w-[196px] overflow-hidden rounded-2xl border border-[#d3dbe8] bg-gradient-to-b from-[#ffffff] to-[#f6f8fc] shadow-[0_20px_40px_#0f214428]"
                role="menu"
              >
                <Link
                  href="/profile"
                  role="menuitem"
                  className="block w-full px-4 py-3 text-left font-semibold text-[#1f2937] transition hover:bg-[#edf2fb] hover:text-[#1f3f85]"
                  onClick={() => setIsDropdownOpen(false)}
                >
                  Profile
                </Link>
                <button
                  type="button"
                  role="menuitem"
                  className="block w-full px-4 py-3 text-left font-semibold text-[#1f2937] transition hover:bg-[#edf2fb] hover:text-[#1f3f85]"
                  onClick={handleLogout}
                >
                  Logout
                </button>
              </div>
            ) : null}
          </div>
        )}
      </nav>
    </header>
  );
}
