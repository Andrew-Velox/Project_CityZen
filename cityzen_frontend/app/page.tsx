import Link from "next/link";

export default function Home() {
  return (
    <main className="dashboard-shell">
      <section className="dashboard-card">
        <p className="dashboard-label">CityZen Platform</p>
        <h1>Authentication is now connected to DRF</h1>
        <p>
          Use the dedicated auth pages to sign up, log in, and enter the token-protected
          dashboard.
        </p>
        <div className="home-actions">
          <Link href="/login">Go to login</Link>
          <Link href="/signup">Go to signup</Link>
        </div>
      </section>
    </main>
  );
}
