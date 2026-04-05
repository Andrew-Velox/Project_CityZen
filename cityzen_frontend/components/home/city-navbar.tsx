import Link from "next/link";

export function CityNavbar() {
  return (
    <header className="city-nav-wrap">
      <nav className="city-nav" aria-label="Main navigation">
        <Link href="/" className="city-brand">
          <span className="city-brand-dot" />
          CityZen
        </Link>

        <div className="city-nav-links">
          <Link href="/login">Login</Link>
          <Link href="/signup">Sign up</Link>
          <Link href="/dashboard">Dashboard</Link>
          <Link href="/profile">Profile</Link>
        </div>
      </nav>
    </header>
  );
}
