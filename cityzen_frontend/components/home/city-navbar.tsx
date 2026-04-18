"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { getMyProfile, refreshAccessToken } from "@/lib/api/auth";
import { clearTokens, getAccessToken, getRefreshToken, setTokens } from "@/lib/auth/token-store";
import { ApiError } from "@/lib/api/types";

type NavbarUser = {
  firstName: string;
  avatar: string | null;
};

export function CityNavbar() {
  const router = useRouter();
  const pathname = usePathname();
  const isHomeRoute = pathname === "/";
  const navRef = useRef<HTMLElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const areaSearchRef = useRef<HTMLDivElement | null>(null);
  const areaSearchInputRef = useRef<HTMLInputElement | null>(null);

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<NavbarUser | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isAreaSearchOpen, setIsAreaSearchOpen] = useState(false);
  const [activeAreaSearch, setActiveAreaSearch] = useState("");
  const [areaSearchInput, setAreaSearchInput] = useState("");
  const [areaOptions, setAreaOptions] = useState<string[]>([]);

  function readAreaSearchFromUrl() {
    if (typeof window === "undefined") return "";
    return new URLSearchParams(window.location.search).get("areaSearch") || "";
  }

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
  }, [pathname]);

  // Close menus when clicking outside
  useEffect(() => {
    function onClickOutside(event: MouseEvent) {
      // Close profile dropdown
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
      // Close mobile menu
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        setIsMobileMenuOpen(false);
      }
      // Close area search
      if (areaSearchRef.current && !areaSearchRef.current.contains(event.target as Node)) {
        setIsAreaSearchOpen(false);
      }
    }

    document.addEventListener("mousedown", onClickOutside);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
    };
  }, []);

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    const syncAreaSearchFromUrl = () => {
      setActiveAreaSearch(readAreaSearchFromUrl());
    };

    syncAreaSearchFromUrl();
    window.addEventListener("popstate", syncAreaSearchFromUrl);
    window.addEventListener("cityzen:area-search-change", syncAreaSearchFromUrl as EventListener);

    return () => {
      window.removeEventListener("popstate", syncAreaSearchFromUrl);
      window.removeEventListener("cityzen:area-search-change", syncAreaSearchFromUrl as EventListener);
    };
  }, []);

  useEffect(() => {
    const syncAreaOptions = (event: Event) => {
      const customEvent = event as CustomEvent<string[]>;
      const nextAreas = Array.isArray(customEvent.detail) ? customEvent.detail : [];
      setAreaOptions(nextAreas);
    };

    const requestAreaOptions = () => {
      window.dispatchEvent(new CustomEvent("cityzen:areas-request"));
    };

    window.addEventListener("cityzen:areas-update", syncAreaOptions as EventListener);
    requestAreaOptions();

    return () => {
      window.removeEventListener("cityzen:areas-update", syncAreaOptions as EventListener);
    };
  }, []);

  useEffect(() => {
    if (!isAreaSearchOpen) return;
    window.dispatchEvent(new CustomEvent("cityzen:areas-request"));
  }, [isAreaSearchOpen]);

  useEffect(() => {
    setAreaSearchInput(activeAreaSearch);
  }, [activeAreaSearch]);

  useEffect(() => {
    if (isAreaSearchOpen) {
      areaSearchInputRef.current?.focus();
    }
  }, [isAreaSearchOpen]);

  function updateAreaSearchQuery(nextValue: string) {
    if (!isHomeRoute) return;

    const params = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");

    if (nextValue.length > 0) {
      params.set("areaSearch", nextValue);
    } else {
      params.delete("areaSearch");
    }

    const query = params.toString();
    if (typeof window !== "undefined") {
      window.history.replaceState(window.history.state, "", query ? `/?${query}` : "/");
    }
    setActiveAreaSearch(nextValue);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("cityzen:area-search-change"));
    }
  }

  const normalizedInput = areaSearchInput.trim().toLowerCase();
  const filteredAreaOptions = areaOptions.filter((area) => {
    if (!normalizedInput) return true;
    return area.toLowerCase().includes(normalizedInput);
  });

  function handleLogout() {
    clearTokens();
    setIsLoggedIn(false);
    setUser(null);
    setIsDropdownOpen(false);
    setIsMobileMenuOpen(false);
    router.push("/login");
  }

  return (
    <header
      className={`${
        isHomeRoute
          ? "absolute inset-x-0 top-0 z-[2800] w-full bg-transparent"
          : "sticky top-0 z-[2200] w-full shrink-0 bg-transparent"
      } transition-all`}
      ref={navRef}
    >
      <nav
        className="relative z-[2201] mx-auto mt-4 flex w-[calc(100%-1.5rem)] max-w-6xl items-center justify-between gap-3 rounded-3xl border border-[#c5d7ea99] bg-[#e9f5ff3b] px-4 py-3 shadow-[0_10px_26px_#1528481a] backdrop-blur-[14px] sm:w-[calc(100%-2rem)]"
        aria-label="Main navigation"
      >
        {/* Logo */}
        <Link href="/" className="inline-flex items-center gap-2 font-extrabold tracking-[0.01em] text-[#0f172a]">
          <Image
            src="/logo.png"
            alt="CityZen logo"
            width={34}
            height={34}
            priority
            className="h-[34px] w-[34px] rounded-lg object-contain"
          />
          CityZen
        </Link>

        {/* Desktop Middle Links */}
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

        {/* Right Section: Auth & Mobile Toggle */}
        <div className="flex items-center justify-end gap-2 sm:gap-3">
          {isHomeRoute ? (
            <div ref={areaSearchRef} className="relative shrink-0">
              <div
                className={`flex items-center overflow-hidden rounded-2xl border backdrop-blur-xl transition-all duration-300 ease-out ${
                  isAreaSearchOpen
                    ? "w-[min(72vw,15rem)] border-[#c7d7ef] bg-gradient-to-r from-white/95 via-[#f8fbff]/95 to-[#eef5ff]/95 px-2.5 py-1.5 shadow-[0_14px_28px_#0f26501f] ring-1 ring-white/80"
                    : `w-9 border-[#c7d7ef99] p-0.5 shadow-[0_8px_18px_#0f265014] sm:w-10 ${activeAreaSearch ? "bg-[#edf2fb] ring-1 ring-[#c8d7f2]" : "bg-white/70"}`
                }`}
              >
                <button
                  type="button"
                  onClick={() => setIsAreaSearchOpen(true)}
                  className={`grid h-8 w-8 shrink-0 place-items-center rounded-xl transition-all duration-300 ${
                    isAreaSearchOpen || activeAreaSearch
                      ? "bg-white text-[#1f4fd7] shadow-[0_6px_16px_#1f4fd726]"
                      : "text-[#334155] hover:bg-[#edf2fb]"
                  }`}
                  aria-label="Open area search"
                >
                  <svg className="h-4.5 w-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="7" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                </button>

                <input
                  ref={areaSearchInputRef}
                  type="text"
                  value={areaSearchInput}
                  onChange={(event) => {
                    const nextValue = event.target.value;
                    setAreaSearchInput(nextValue);
                    updateAreaSearchQuery(nextValue);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Escape") {
                      setIsAreaSearchOpen(false);
                    }
                  }}
                  className={`min-w-0 bg-transparent text-sm font-semibold text-[#334155] outline-none placeholder:text-[#64748b] transition-all duration-300 ${
                    isAreaSearchOpen
                      ? "ml-2 flex-1 opacity-100"
                      : "ml-0 w-0 opacity-0 pointer-events-none"
                  }`}
                  placeholder="Search area"
                  aria-label="Search area"
                />

                <button
                  type="button"
                  onClick={() => {
                    setAreaSearchInput("");
                    updateAreaSearchQuery("");
                    setIsAreaSearchOpen(false);
                  }}
                  className={`grid shrink-0 place-items-center rounded-full text-[#64748b] transition-all duration-200 hover:bg-[#edf2fb] hover:text-[#1f4fd7] ${
                    isAreaSearchOpen ? "ml-1 h-6 w-6 scale-100 opacity-100" : "h-0 w-0 scale-75 opacity-0 pointer-events-none"
                  }`}
                  aria-label="Close area search"
                >
                  <svg className="h-3.5 w-3.5" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M13 1L1 13M1 1l12 12" />
                  </svg>
                </button>
              </div>

              {isAreaSearchOpen ? (
                <div className="absolute right-0 top-[calc(100%+0.55rem)] z-[3100] w-full min-w-[12.5rem] max-w-[calc(100vw-1.25rem)] overflow-hidden rounded-2xl border border-[#c9d7ed] bg-gradient-to-b from-white/95 to-[#f4f8ff]/95 shadow-[0_18px_34px_#12274a26] backdrop-blur-xl animate-in fade-in zoom-in-95 duration-200">
                  <div className="max-h-52 overflow-y-auto py-1.5 sm:max-h-56">
                    {filteredAreaOptions.length === 0 ? (
                      <p className="px-3 py-2 text-xs font-medium text-[#64748b]">No matching area found</p>
                    ) : (
                      filteredAreaOptions.map((area) => (
                        <button
                          key={area}
                          type="button"
                          onClick={() => {
                            setAreaSearchInput(area);
                            updateAreaSearchQuery(area);
                            setIsAreaSearchOpen(false);
                          }}
                          className="block w-full px-3 py-2.5 text-left text-sm font-semibold text-[#334155] transition hover:bg-[#edf3ff] hover:text-[#1f4fd7]"
                        >
                          {area}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          {isLoading ? (
            <div className="hidden md:block h-10 w-24 animate-pulse rounded-xl bg-[#e2e8f0]" />
          ) : !isLoggedIn ? (
            <div className="hidden md:flex flex-wrap gap-2">
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
                <span className={`hidden sm:block text-[0.9rem] leading-none text-[#2b3f66] transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`}>▾</span>
              </button>

              {/* Profile Dropdown */}
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

          {/* Hamburger Icon (Mobile Only) */}
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-xl p-2 text-[#334155] transition hover:bg-[#edf2fb] md:hidden"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle mobile menu"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {isMobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile Dropdown Menu */}
        {isMobileMenuOpen ? (
          <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-[3000] overflow-hidden rounded-3xl border border-[#c5d7ea99] bg-[#ffffffef] p-3 shadow-[0_20px_40px_#15284826] backdrop-blur-[14px] md:hidden animate-in fade-in slide-in-from-top-4">
            <div className="flex flex-col gap-1">
              <Link
                href="/"
                className="rounded-xl px-4 py-3 text-[0.95rem] font-semibold text-[#334155] transition hover:bg-[#edf2fb] hover:text-[#1f4fd7]"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                হোম
              </Link>
              <Link
                href="/community"
                className="rounded-xl px-4 py-3 text-[0.95rem] font-semibold text-[#334155] transition hover:bg-[#edf2fb] hover:text-[#1f4fd7]"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                কমিউনিটি
              </Link>
              <Link
                href="/about"
                className="rounded-xl px-4 py-3 text-[0.95rem] font-semibold text-[#334155] transition hover:bg-[#edf2fb] hover:text-[#1f4fd7]"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                পরিচিতি
              </Link>
              <Link
                href="/faq"
                className="rounded-xl px-4 py-3 text-[0.95rem] font-semibold text-[#334155] transition hover:bg-[#edf2fb] hover:text-[#1f4fd7]"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                জিজ্ঞাসা
              </Link>

              {/* Show auth links in mobile menu if not logged in */}
              {!isLoading && !isLoggedIn && (
                <div className="mt-2 flex flex-col gap-2 border-t border-[#d3dbe8] pt-3">
                  <Link
                    href="/login"
                    className="rounded-xl px-4 py-3 text-center text-[0.95rem] font-semibold text-[#334155] transition hover:bg-[#edf2fb]"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    লগইন
                  </Link>
                  <Link
                    href="/signup"
                    className="rounded-xl bg-gradient-to-br from-[#1f4fd7] to-[#173ea8] px-4 py-3 text-center text-[0.95rem] font-semibold text-[#ffffff] shadow-md"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    সাইন আপ
                  </Link>
                </div>
              )}
            </div>
          </div>
        ) : null}
      </nav>
    </header>
  );
}