import Link from "next/link";
import Image from "next/image";
import type { ReactNode } from "react";

type AuthShellProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
  footerText: string;
  footerCtaLabel: string;
  footerHref: string;
};

export function AuthShell({
  title,
  subtitle,
  children,
  footerText,
  footerCtaLabel,
  footerHref,
}: AuthShellProps) {
  return (
    <div className="relative grid min-h-[calc(100dvh-5.5rem)] place-items-center overflow-hidden px-4 py-8">
      <div className="pointer-events-none absolute inset-0 bg-[#eaf4ef]" aria-hidden="true" />
      <div
        className="pointer-events-none absolute left-0 right-0 top-[34%] h-[66%] bg-gradient-to-b from-[#66d39f] via-[#8fdfba] to-[#b7e7cf]"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute left-0 right-0 top-[33.6%] h-10 bg-[radial-gradient(120%_90%_at_50%_0%,#8ce4bb_0%,rgba(140,228,187,0)_75%)]"
        aria-hidden="true"
      />

      <main
        className="relative z-[1] w-full max-w-md rounded-[28px] border border-[#c7ead7] bg-[linear-gradient(180deg,rgba(239,248,243,0.9)_0%,rgba(168,228,198,0.7)_100%)] p-6 shadow-[0_30px_60px_rgba(18,80,52,0.18)] backdrop-blur-[8px] md:p-9"
        aria-labelledby="auth-title"
      >
        <header className="mb-6 text-center">
          <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full border border-[#6dd5a6] bg-[#effaf2] shadow-[0_10px_20px_rgba(35,131,85,0.2)]">
            <Image src="/logo.png" alt="CityZen logo" width={28} height={28} className="h-7 w-7 object-contain" priority />
          </div>

          <h1 id="auth-title" className="m-0 text-[clamp(1.72rem,2.4vw,2.1rem)] font-bold leading-tight text-[#1d2f25]">
            {title}
          </h1>
          <p className="mt-2 text-[#416857]">{subtitle}</p>
        </header>

        {children}

        <footer className="mt-6 text-center text-[0.94rem] text-[#416857]">
          {footerText}{" "}
          <Link href={footerHref} className="font-semibold text-[#149458] transition hover:text-[#0f7748]">
            {footerCtaLabel}
          </Link>
        </footer>
      </main>
    </div>
  );
}
