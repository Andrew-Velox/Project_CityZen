import Link from "next/link";

const values = [
  {
    title: "Transparency by Design",
    description:
      "Every report keeps its context, status, and timeline clear so communities can see progress without confusion.",
  },
  {
    title: "People-First UX",
    description:
      "CityZen is built for everyday residents, not only technical users. Reporting and tracking should feel intuitive.",
  },
  {
    title: "Actionable Data",
    description:
      "From map-based reports to trends, we help teams focus on what matters most and act faster.",
  },
];

const milestones = [
  {
    phase: "Observe",
    text: "Residents capture issues with images, location, and category so city teams receive useful, complete reports.",
  },
  {
    phase: "Coordinate",
    text: "Stakeholders review community signals in one place, prioritize by urgency, and align next steps.",
  },
  {
    phase: "Improve",
    text: "Updates and outcomes are shared back to the community, turning one-off reports into long-term civic learning.",
  },
];

export default function AboutPage() {
  return (
    <main className="relative min-h-[calc(100dvh-5.5rem)] overflow-hidden px-3 pb-6 md:px-4 md:pb-8">

      <section className="relative mx-auto w-full max-w-6xl pt-6 md:pt-9">
        <div className="grid gap-5 md:grid-cols-[1.2fr_0.8fr] md:gap-6">
          <article className="rounded-[28px] border border-[#d7e0f0] bg-gradient-to-b from-[#ffffffef] to-[#f8fbffef] p-6 shadow-[0_24px_60px_#0f2b551c] backdrop-blur-[8px] md:p-9">
            <p className="inline-flex rounded-full border border-[#cfdbef] bg-[#f8fbff] px-3 py-1 text-[0.76rem] font-semibold uppercase tracking-[0.08em] text-[#3d5c86]">
              About CityZen
            </p>
            <h1 className="mt-4 text-[clamp(1.8rem,4vw,3rem)] font-extrabold leading-[1.1] text-[#0f172a]">
              Smarter citizen reporting for cleaner, safer, and more responsive cities.
            </h1>
            <p className="mt-4 max-w-2xl text-[1rem] leading-relaxed text-[#334155] md:text-[1.06rem]">
              CityZen connects residents and city teams through one collaborative reporting workspace. We help communities submit
              issues with clear evidence and help authorities move from scattered complaints to structured action.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href="/"
                className="inline-flex min-h-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#1f4fd7] to-[#173ea8] px-4 py-2 font-semibold text-white transition hover:-translate-y-[1px] hover:shadow-[0_10px_22px_#12295a36]"
              >
                Explore Map
              </Link>
              <Link
                href="/community"
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#cad6ec] bg-white px-4 py-2 font-semibold text-[#23324a] transition hover:-translate-y-[1px] hover:bg-[#f7faff]"
              >
                Join Community
              </Link>
            </div>
          </article>

          <aside className="grid gap-4">
            <div className="rounded-[24px] border border-[#d7e0f0] bg-white/90 p-5 shadow-[0_18px_42px_#16346117] backdrop-blur-[6px]">
              <p className="text-[0.8rem] font-semibold uppercase tracking-[0.08em] text-[#4b668d]">Our Impact Lens</p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-[#dbe5f5] bg-[#f8fbff] p-3.5">
                  <p className="text-[1.45rem] font-extrabold text-[#143f9b]">24/7</p>
                  <p className="mt-1 text-[0.85rem] text-[#3d4e66]">Report access</p>
                </div>
                <div className="rounded-xl border border-[#dbe5f5] bg-[#f8fbff] p-3.5">
                  <p className="text-[1.45rem] font-extrabold text-[#143f9b]">1 Map</p>
                  <p className="mt-1 text-[0.85rem] text-[#3d4e66]">Shared visibility</p>
                </div>
                <div className="rounded-xl border border-[#dbe5f5] bg-[#f8fbff] p-3.5">
                  <p className="text-[1.45rem] font-extrabold text-[#143f9b]">Faster</p>
                  <p className="mt-1 text-[0.85rem] text-[#3d4e66]">Issue triage</p>
                </div>
                <div className="rounded-xl border border-[#dbe5f5] bg-[#f8fbff] p-3.5">
                  <p className="text-[1.45rem] font-extrabold text-[#143f9b]">Clear</p>
                  <p className="mt-1 text-[0.85rem] text-[#3d4e66]">Public updates</p>
                </div>
              </div>
            </div>

            <div className="rounded-[24px] border border-[#d7e0f0] bg-gradient-to-br from-[#eef4ff] to-[#e6efff] p-5 shadow-[0_18px_42px_#16346114]">
              <p className="text-sm font-semibold text-[#1f3f85]">Why CityZen?</p>
              <p className="mt-2 text-[0.94rem] leading-relaxed text-[#2f4058]">
                Civic feedback is powerful when it is structured, visible, and easy to act on. Our platform is designed to make
                that loop practical for both residents and local teams.
              </p>
            </div>
          </aside>
        </div>
      </section>

      <section className="relative mx-auto mt-6 w-full max-w-6xl rounded-[28px] border border-[#d7e0f0] bg-white/92 p-5 shadow-[0_24px_56px_#193b6b17] md:mt-8 md:p-7">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[0.8rem] font-semibold uppercase tracking-[0.08em] text-[#4b668d]">How We Work</p>
            <h2 className="mt-1 text-[clamp(1.25rem,2.4vw,1.8rem)] font-bold text-[#0f172a]">A transparent civic action loop</h2>
          </div>
          <Link href="/faq" className="text-sm font-semibold text-[#1f4fd7] transition hover:text-[#173ea8]">
            Read FAQ {"->"}
          </Link>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {milestones.map((item, index) => (
            <article key={item.phase} className="rounded-2xl border border-[#dce6f7] bg-[#f8fbff] p-4">
              <p className="font-mono text-[0.75rem] tracking-[0.05em] text-[#4a6288]">Step {index + 1}</p>
              <h3 className="mt-1 text-lg font-bold text-[#102a5f]">{item.phase}</h3>
              <p className="mt-2 text-[0.95rem] leading-relaxed text-[#31435c]">{item.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="relative mx-auto mt-6 w-full max-w-6xl md:mt-8">
        <div className="mb-4">
          <p className="text-[0.8rem] font-semibold uppercase tracking-[0.08em] text-[#4b668d]">Core Values</p>
          <h2 className="mt-1 text-[clamp(1.25rem,2.4vw,1.8rem)] font-bold text-[#0f172a]">Built for trust, clarity, and momentum</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {values.map((item) => (
            <article
              key={item.title}
              className="rounded-[22px] border border-[#d7e0f0] bg-gradient-to-b from-[#ffffffee] to-[#f7faffee] p-5 shadow-[0_16px_35px_#17346314] transition hover:-translate-y-[2px]"
            >
              <h3 className="text-[1.05rem] font-bold text-[#0e295f]">{item.title}</h3>
              <p className="mt-2 text-[0.95rem] leading-relaxed text-[#344761]">{item.description}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
