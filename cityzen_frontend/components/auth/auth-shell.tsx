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
    <div className="auth-scene">
      <div className="auth-grid-overlay" />
      <main className="auth-card" aria-labelledby="auth-title">
        <header className="auth-header">
          <p className="auth-badge">CityZen</p>
          <h1 id="auth-title">{title}</h1>
          <p>{subtitle}</p>
        </header>

        {children}

        <footer className="auth-footer">
          {footerText} <Link href={footerHref}>{footerCtaLabel}</Link>
        </footer>
      </main>
    </div>
  );
}
