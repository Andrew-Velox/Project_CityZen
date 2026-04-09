import Link from "next/link";

const values = [
  {
    title: "কাঠামোগত স্বচ্ছতা",
    description:
      "প্রতিটি রিপোর্টের প্রেক্ষাপট, বর্তমান অবস্থা এবং সময়সীমা পরিষ্কার রাখা হয়, যাতে নাগরিকরা কোনো বিভ্রান্তি ছাড়াই কাজের অগ্রগতি দেখতে পারেন।",
  },
  {
    title: "জনবান্ধব অভিজ্ঞতা",
    description:
      "সিটিজেন (CityZen) সাধারণ নাগরিকদের জন্য তৈরি, শুধুমাত্র প্রযুক্তি বিশেষজ্ঞদের জন্য নয়। অভিযোগ জানানো এবং ট্র্যাক করা হওয়া উচিত অত্যন্ত সহজ।",
  },
  {
    title: "কার্যকরী তথ্য",
    description:
      "ম্যাপ-ভিত্তিক রিপোর্ট থেকে শুরু করে নানা ট্রেন্ড বিশ্লেষণের মাধ্যমে আমরা কর্তৃপক্ষকে দ্রুত এবং সঠিক পদক্ষেপ নিতে সাহায্য করি।",
  },
];

const milestones = [
  {
    phase: "পর্যবেক্ষণ",
    text: "নাগরিকরা ছবি, অবস্থান এবং ক্যাটাগরি উল্লেখ করে সমস্যাগুলো তুলে ধরেন, যাতে কর্তৃপক্ষ একটি পূর্ণাঙ্গ এবং কার্যকরী রিপোর্ট পায়।",
  },
  {
    phase: "সমন্বয়",
    text: "সংশ্লিষ্ট কর্তৃপক্ষ একই প্ল্যাটফর্মে সব রিপোর্ট যাচাই করেন, গুরুত্ব অনুযায়ী কাজ নির্ধারণ করেন এবং পরবর্তী পদক্ষেপ নেন।",
  },
  {
    phase: "উন্নয়ন",
    text: "কাজের অগ্রগতি এবং ফলাফল নাগরিকদের জানানো হয়, যা একটি বিচ্ছিন্ন অভিযোগকে দীর্ঘমেয়াদী নাগরিক উন্নয়নে পরিণত করে।",
  },
];

export default function AboutPage() {
  return (
    <main className="relative min-h-[calc(100dvh-5.5rem)] overflow-hidden px-3 pb-6 md:px-4 md:pb-8">
      <section className="relative mx-auto w-full max-w-6xl pt-6 md:pt-9">
        <div className="grid gap-5 md:grid-cols-[1.2fr_0.8fr] md:gap-6">
          <article className="rounded-[28px] border border-[#d7e0f0] bg-gradient-to-b from-[#ffffffef] to-[#f8fbffef] p-6 shadow-[0_24px_60px_#0f2b551c] backdrop-blur-[8px] md:p-9">
            <p className="inline-flex rounded-full border border-[#cfdbef] bg-[#f8fbff] px-3 py-1 text-[0.76rem] font-semibold uppercase tracking-[0.08em] text-[#3d5c86]">
              সিটিজেন সম্পর্কে
            </p>
            <h1 className="mt-4 text-[clamp(1.8rem,4vw,3rem)] font-extrabold leading-[1.1] text-[#0f172a]">
              পরিচ্ছন্ন, নিরাপদ এবং দায়িত্বশীল শহরের জন্য একটি স্মার্ট নাগরিক রিপোর্টিং ব্যবস্থা।
            </h1>
            <p className="mt-4 max-w-2xl text-[1rem] leading-relaxed text-[#334155] md:text-[1.06rem]">
              সিটিজেন একটি সমন্বিত প্ল্যাটফর্মের মাধ্যমে নাগরিক এবং নগর কর্তৃপক্ষের মধ্যে সেতুবন্ধন তৈরি করে। আমরা পরিষ্কার প্রমাণের ভিত্তিতে সমস্যাগুলো তুলে ধরতে এবং কর্তৃপক্ষকে সুশৃঙ্খলভাবে পদক্ষেপ নিতে সাহায্য করি।
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href="/"
                className="inline-flex min-h-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#1f4fd7] to-[#173ea8] px-4 py-2 font-semibold text-white transition hover:-translate-y-[1px] hover:shadow-[0_10px_22px_#12295a36]"
              >
                ম্যাপ দেখুন
              </Link>
              <Link
                href="/community"
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#cad6ec] bg-white px-4 py-2 font-semibold text-[#23324a] transition hover:-translate-y-[1px] hover:bg-[#f7faff]"
              >
                কমিউনিটিতে যোগ দিন
              </Link>
            </div>
          </article>

          <aside className="grid gap-4">
            <div className="rounded-[24px] border border-[#d7e0f0] bg-white/90 p-5 shadow-[0_18px_42px_#16346117] backdrop-blur-[6px]">
              <p className="text-[0.8rem] font-semibold uppercase tracking-[0.08em] text-[#4b668d]">আমাদের প্রভাব</p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-[#dbe5f5] bg-[#f8fbff] p-3.5">
                  <p className="text-[1.45rem] font-extrabold text-[#143f9b]">২৪/৭</p>
                  <p className="mt-1 text-[0.85rem] text-[#3d4e66]">রিপোর্টের অ্যাক্সেস</p>
                </div>
                <div className="rounded-xl border border-[#dbe5f5] bg-[#f8fbff] p-3.5">
                  <p className="text-[1.45rem] font-extrabold text-[#143f9b]">১টি ম্যাপ</p>
                  <p className="mt-1 text-[0.85rem] text-[#3d4e66]">সবার জন্য দৃশ্যমান</p>
                </div>
                <div className="rounded-xl border border-[#dbe5f5] bg-[#f8fbff] p-3.5">
                  <p className="text-[1.45rem] font-extrabold text-[#143f9b]">দ্রুততর</p>
                  <p className="mt-1 text-[0.85rem] text-[#3d4e66]">সমস্যা সমাধান</p>
                </div>
                <div className="rounded-xl border border-[#dbe5f5] bg-[#f8fbff] p-3.5">
                  <p className="text-[1.45rem] font-extrabold text-[#143f9b]">সুস্পষ্ট</p>
                  <p className="mt-1 text-[0.85rem] text-[#3d4e66]">পাবলিক আপডেট</p>
                </div>
              </div>
            </div>

            <div className="rounded-[24px] border border-[#d7e0f0] bg-gradient-to-br from-[#eef4ff] to-[#e6efff] p-5 shadow-[0_18px_42px_#16346114]">
              <p className="text-sm font-semibold text-[#1f3f85]">সিটিজেন কেন?</p>
              <p className="mt-2 text-[0.94rem] leading-relaxed text-[#2f4058]">
                নাগরিকদের মতামত তখনই সবচেয়ে বেশি কার্যকর হয় যখন তা সুসংগঠিত, দৃশ্যমান এবং সহজেই পদক্ষেপ নেওয়ার যোগ্য হয়। আমাদের প্ল্যাটফর্মটি নাগরিক এবং স্থানীয় কর্তৃপক্ষ উভয়ের জন্যই এই প্রক্রিয়াটিকে সহজ ও বাস্তবসম্মত করতে ডিজাইন করা হয়েছে।
              </p>
            </div>
          </aside>
        </div>
      </section>

      <section className="relative mx-auto mt-6 w-full max-w-6xl rounded-[28px] border border-[#d7e0f0] bg-white/92 p-5 shadow-[0_24px_56px_#193b6b17] md:mt-8 md:p-7">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[0.8rem] font-semibold uppercase tracking-[0.08em] text-[#4b668d]">আমাদের কার্যপ্রণালী</p>
            <h2 className="mt-1 text-[clamp(1.25rem,2.4vw,1.8rem)] font-bold text-[#0f172a]">একটি স্বচ্ছ নাগরিক কার্যক্রমের চক্র</h2>
          </div>
          <Link href="/faq" className="text-sm font-semibold text-[#1f4fd7] transition hover:text-[#173ea8]">
            সাধারণ জিজ্ঞাসা পড়ুন {"->"}
          </Link>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {milestones.map((item, index) => (
            <article key={item.phase} className="rounded-2xl border border-[#dce6f7] bg-[#f8fbff] p-4">
              <p className="font-mono text-[0.75rem] tracking-[0.05em] text-[#4a6288]">ধাপ {index + 1}</p>
              <h3 className="mt-1 text-lg font-bold text-[#102a5f]">{item.phase}</h3>
              <p className="mt-2 text-[0.95rem] leading-relaxed text-[#31435c]">{item.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="relative mx-auto mt-6 w-full max-w-6xl md:mt-8">
        <div className="mb-4">
          <p className="text-[0.8rem] font-semibold uppercase tracking-[0.08em] text-[#4b668d]">আমাদের মূলনীতি</p>
          <h2 className="mt-1 text-[clamp(1.25rem,2.4vw,1.8rem)] font-bold text-[#0f172a]">বিশ্বাস, স্বচ্ছতা এবং গতির জন্য নির্মিত</h2>
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