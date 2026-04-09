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
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function resolveSession() {
      const access = getAccessToken();
      const refresh = getRefreshToken();

      if (!access) {
        if (!mounted) return;
        setIsLoggedIn(false);
        setUser(null);
        setIsLoading(false);
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
          setIsLoading(false);
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
      } finally {
        if (mounted) setIsLoading(false);
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
    <header className="sticky top-0 z-[2200] mx-auto w-full shrink-0 bg-transparent transition-all">
      <nav
        className="relative z-[2201] mx-4 mt-4 flex items-center justify-between gap-3 rounded-3xl border border-[#c5d7ea99] bg-[#e9f5ff3b] px-4 py-3 shadow-[0_10px_26px_#1528481a] backdrop-blur-[14px]"
        aria-label="Main navigation"
      >
        {/* Logo */}
        <Link href="/" className="inline-flex min-w-[120px] items-center gap-2 font-extrabold tracking-[0.01em] text-[#0f172a]">
          <span className="h-[10px] w-[10px] rounded-full bg-gradient-to-br from-[#1f4fd7] to-[#2f5c7c]" />
          CityZen
        </Link>

        {/* Middle Links */}
        <div className="hidden md:flex items-center gap-6">
          <Link href="/" className="font-semibold text-[#334155] transition hover:-translate-y-[1px] hover:text-[#1f4fd7]">
            হোম
          </Link>
          <Link href="/community" className="font-semibold text-[#334155] transition hover:-translate-y-[1px] hover:text-[#1f4fd7]">
            কমিউনিটি
          </Link>
          <Link href="/about" className="font-semibold text-[#334155] transition hover:-translate-y-[1px] hover:text-[#1f4fd7]">
            পরিচিতি
          </Link>
          <Link href="/faq" className="font-semibold text-[#334155] transition hover:-translate-y-[1px] hover:text-[#1f4fd7]">
            জিজ্ঞাসা
          </Link>
        </div>

        {/* Auth Section */}
        <div className="flex min-w-[120px] justify-end">
          {isLoading ? (
            <div className="h-10 w-24 animate-pulse rounded-xl bg-[#e2e8f0]" />
          ) : !isLoggedIn ? (
            <div className="flex flex-wrap gap-2">
              <Link
                href="/login"
                className="rounded-xl px-3 py-2 font-semibold text-[#334155] transition hover:-translate-y-[1px] hover:bg-[#edf2fb] hover:text-[#233e7f]"
              >
                লগইন
              </Link>
              <Link
                href="/signup"
                className="rounded-xl bg-gradient-to-br from-[#1f4fd7] to-[#173ea8] px-3 py-2 font-semibold text-[#ffffff] transition hover:-translate-y-[1px] hover:shadow-[0_10px_20px_#12295a36]"
              >
                সাইন আপ
              </Link>
            </div>
          ) : (
            <div className="relative z-[2202] flex items-center justify-end gap-3" ref={dropdownRef}>
              <p className="hidden text-[0.94rem] font-semibold text-[#243147] sm:block">
                স্বাগতম, {user?.firstName || "ব্যবহারকারী"}
              </p>

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
                <span className={`text-[0.9rem] leading-none text-[#2b3f66] transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`}>▾</span>
              </button>

              {isDropdownOpen ? (
                <div
                  className="absolute right-0 top-[calc(100%+0.6rem)] z-[3000] min-w-[196px] overflow-hidden rounded-2xl border border-[#d3dbe8] bg-gradient-to-b from-[#ffffff] to-[#f6f8fc] shadow-[0_20px_40px_#0f214428] animate-in fade-in slide-in-from-top-2"
                  role="menu"
                >
                  <Link
                    href="/profile"
                    role="menuitem"
                    className="block w-full px-4 py-3 text-left font-semibold text-[#1f2937] transition hover:bg-[#edf2fb] hover:text-[#1f3f85]"
                    onClick={() => setIsDropdownOpen(false)}
                  >
                    প্রোফাইল
                  </Link>
                  <button
                    type="button"
                    role="menuitem"
                    className="block w-full px-4 py-3 text-left font-semibold text-[#ef4444] transition hover:bg-[#fef2f2] hover:text-[#b91c1c]"
                    onClick={handleLogout}
                  >
                    লগআউট
                  </button>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </nav>
    </header>
  );
}