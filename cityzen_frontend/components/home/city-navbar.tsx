"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { getMyProfile, refreshAccessToken } from "@/lib/api/auth";
import { clearTokens, getAccessToken, getRefreshToken, setTokens } from "@/lib/auth/token-store";
import { ApiError } from "@/lib/api/types";
import { useLanguage } from "@/components/i18n/language-context";

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
  const { language } = useLanguage();

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<NavbarUser | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const text =
    language === "bn"
      ? {
          home: "হোম",
          community: "কমিউনিটি",
          about: "পরিচিতি",
          faq: "জিজ্ঞাসা",
          login: "লগইন",
          signup: "সাইন আপ",
          welcome: "স্বাগতম",
          userFallback: "ব্যবহারকারী",
          profile: "প্রোফাইল",
          logout: "লগআউট",
          toggleMobileMenu: "মোবাইল মেনু টগল করুন",
        }
      : {
          home: "Home",
          community: "Community",
          about: "About",
          faq: "FAQ",
          login: "Login",
          signup: "Sign up",
          welcome: "Welcome",
          userFallback: "User",
          profile: "Profile",
          logout: "Logout",
          toggleMobileMenu: "Toggle mobile menu",
        };

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
          ? "absolute inset-x-0 top-0 z-[2800] w-full bg-transparent pointer-events-none"
          : "sticky top-0 z-[2200] w-full shrink-0 bg-transparent pointer-events-none"
      } transition-all`}
      ref={navRef}
    >
      <nav
        className="relative z-[2201] mx-auto mt-4 flex w-[calc(100%-1.5rem)] max-w-6xl items-center justify-between gap-3 rounded-3xl border border-[#c5d7ea99] bg-[#e9f5ff3b] px-4 py-3 shadow-[0_10px_26px_#1528481a] backdrop-blur-[14px] pointer-events-auto sm:w-[calc(100%-2rem)]"
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
            {text.home}
          </Link>
          {isLoggedIn ? (
            <Link href="/community" className="font-semibold text-[#334155] transition hover:-translate-y-[1px] hover:text-[#1f4fd7]">
              {text.community}
            </Link>
          ) : null}
          <Link href="/about" className="font-semibold text-[#334155] transition hover:-translate-y-[1px] hover:text-[#1f4fd7]">
            {text.about}
          </Link>
          <Link href="/faq" className="font-semibold text-[#334155] transition hover:-translate-y-[1px] hover:text-[#1f4fd7]">
            {text.faq}
          </Link>
          <Link href="/rag" className="font-semibold text-[#334155] transition hover:-translate-y-[1px] hover:text-[#1f4fd7]">
            চ্যাটবট
          </Link>
        </div>

        {/* Right Section: Auth & Mobile Toggle */}
        <div className="flex items-center justify-end gap-2 sm:gap-3">
          {isLoading ? (
            <div className="hidden md:block h-10 w-24 animate-pulse rounded-xl bg-[#e2e8f0]" />
          ) : !isLoggedIn ? (
            <div className="hidden md:flex flex-wrap gap-2">
              <Link
                href="/login"
                className="rounded-xl px-3 py-2 font-semibold text-[#334155] transition hover:-translate-y-[1px] hover:bg-[#edf2fb] hover:text-[#233e7f]"
              >
                {text.login}
              </Link>
              <Link
                href="/signup"
                className="rounded-xl border border-[#9fcfe8] bg-[#B9E5FE] px-3 py-2 font-semibold text-[#0e3550] transition hover:-translate-y-[1px] hover:bg-[#a8defc] hover:shadow-[0_10px_20px_#6fa8c83b]"
              >
                {text.signup}
              </Link>
            </div>
          ) : (
            <div className="relative z-[2202] flex items-center justify-end gap-3" ref={dropdownRef}>
              <p className="hidden text-[0.94rem] font-semibold text-[#243147] sm:block">
                {text.welcome}, {user?.firstName || text.userFallback}
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
                    {text.profile}
                  </Link>
                  <button
                    type="button"
                    role="menuitem"
                    className="block w-full px-4 py-3 text-left font-semibold text-[#ef4444] transition hover:bg-[#fef2f2] hover:text-[#b91c1c]"
                    onClick={handleLogout}
                  >
                    {text.logout}
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
            aria-label={text.toggleMobileMenu}
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
                {text.home}
              </Link>
              {isLoggedIn ? (
                <Link
                  href="/community"
                  className="rounded-xl px-4 py-3 text-[0.95rem] font-semibold text-[#334155] transition hover:bg-[#edf2fb] hover:text-[#1f4fd7]"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {text.community}
                </Link>
              ) : null}
              <Link
                href="/about"
                className="rounded-xl px-4 py-3 text-[0.95rem] font-semibold text-[#334155] transition hover:bg-[#edf2fb] hover:text-[#1f4fd7]"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {text.about}
              </Link>
              <Link
                href="/faq"
                className="rounded-xl px-4 py-3 text-[0.95rem] font-semibold text-[#334155] transition hover:bg-[#edf2fb] hover:text-[#1f4fd7]"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {text.faq}
              </Link>
              <Link
                href="/rag"
                className="rounded-xl px-4 py-3 text-[0.95rem] font-semibold text-[#334155] transition hover:bg-[#edf2fb] hover:text-[#1f4fd7]"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                চ্যাটবট
              </Link>

              {/* Show auth links in mobile menu if not logged in */}
              {!isLoading && !isLoggedIn && (
                <div className="mt-2 flex flex-col gap-2 border-t border-[#d3dbe8] pt-3">
                  <Link
                    href="/login"
                    className="rounded-xl px-4 py-3 text-center text-[0.95rem] font-semibold text-[#334155] transition hover:bg-[#edf2fb]"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {text.login}
                  </Link>
                  <Link
                    href="/signup"
                    className="rounded-xl border border-[#9fcfe8] bg-[#B9E5FE] px-4 py-3 text-center text-[0.95rem] font-semibold text-[#0e3550] shadow-md"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {text.signup}
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