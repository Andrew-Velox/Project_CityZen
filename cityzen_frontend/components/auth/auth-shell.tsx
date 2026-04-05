import Link from "next/link";
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
    <div className="relative grid min-h-[calc(100dvh-5.5rem)] place-items-center overflow-hidden bg-gradient-to-br from-[#f8fafd] via-[#eff3f9] to-[#e8eef7] px-4 py-8">
      <div className="pointer-events-none absolute inset-0 opacity-40 [background-image:linear-gradient(to_right,#d8dee8_1px,transparent_1px),linear-gradient(to_bottom,#d8dee8_1px,transparent_1px)] [background-size:32px_32px]" />
      <main
        className="relative z-[1] w-full max-w-2xl rounded-3xl border border-[#d6dde8] bg-gradient-to-b from-[#ffffff] to-[#f9fbff] p-6 shadow-[0_22px_54px_#1123471f] md:p-9"
        aria-labelledby="auth-title"
      >
        <header className="mb-6">
          <p className="mb-3 inline-block rounded-full border border-[#d4ddea] bg-[#edf2fb] px-3 py-1 text-[0.75rem] font-semibold tracking-[0.045em] text-[#1a3f96]">
            CityZen
          </p>
          <h1 id="auth-title" className="m-0 text-[clamp(1.5rem,2.4vw,2rem)] font-bold leading-tight text-[#0f172a]">
            {title}
          </h1>
          <p className="mt-2 text-[#526079]">{subtitle}</p>
        </header>

        {children}

        <footer className="mt-6 text-[0.94rem] text-[#526079]">
          {footerText} <Link href={footerHref}>{footerCtaLabel}</Link>
        </footer>
      </main>
    </div>
  );
}
