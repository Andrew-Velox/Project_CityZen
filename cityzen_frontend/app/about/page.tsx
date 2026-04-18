"use client";

import Link from "next/link";
import { useLanguage } from "@/components/providers/language-provider";

const values = [
  {
    titleBn: "কাঠামোগত স্বচ্ছতা",
    titleEn: "Structured Transparency",
    descriptionBn:
      "প্রতিটি রিপোর্টের প্রেক্ষাপট, বর্তমান অবস্থা এবং সময়সীমা পরিষ্কার রাখা হয়, যাতে নাগরিকরা কোনো বিভ্রান্তি ছাড়াই কাজের অগ্রগতি দেখতে পারেন।",
    descriptionEn:
      "We keep context, status, and timelines clear for each report so citizens can track progress without confusion.",
  },
  {
    titleBn: "জনবান্ধব অভিজ্ঞতা",
    titleEn: "Citizen-First Experience",
    descriptionBn:
      "সিটিজেন (CityZen) সাধারণ নাগরিকদের জন্য তৈরি, শুধুমাত্র প্রযুক্তি বিশেষজ্ঞদের জন্য নয়। অভিযোগ জানানো এবং ট্র্যাক করা হওয়া উচিত অত্যন্ত সহজ।",
    descriptionEn:
      "CityZen is built for everyday people, not only for technical users. Reporting and tracking issues should feel simple.",
  },
  {
    titleBn: "কার্যকরী তথ্য",
    titleEn: "Actionable Insights",
    descriptionBn:
      "ম্যাপ-ভিত্তিক রিপোর্ট থেকে শুরু করে নানা ট্রেন্ড বিশ্লেষণের মাধ্যমে আমরা কর্তৃপক্ষকে দ্রুত এবং সঠিক পদক্ষেপ নিতে সাহায্য করি।",
    descriptionEn:
      "From map-based reports to trend analysis, we help authorities make faster and better decisions.",
  },
];

const milestones = [
  {
    phaseBn: "পর্যবেক্ষণ",
    phaseEn: "Observation",
    textBn: "নাগরিকরা ছবি, অবস্থান এবং ক্যাটাগরি উল্লেখ করে সমস্যাগুলো তুলে ধরেন, যাতে কর্তৃপক্ষ একটি পূর্ণাঙ্গ এবং কার্যকরী রিপোর্ট পায়।",
    textEn: "Citizens submit issues with photos, location, and category so authorities receive complete and useful reports.",
  },
  {
    phaseBn: "সমন্বয়",
    phaseEn: "Coordination",
    textBn: "সংশ্লিষ্ট কর্তৃপক্ষ একই প্ল্যাটফর্মে সব রিপোর্ট যাচাই করেন, গুরুত্ব অনুযায়ী কাজ নির্ধারণ করেন এবং পরবর্তী পদক্ষেপ নেন।",
    textEn: "Responsible teams verify reports in one place, prioritize actions, and move the work forward.",
  },
  {
    phaseBn: "উন্নয়ন",
    phaseEn: "Improvement",
    textBn: "কাজের অগ্রগতি এবং ফলাফল নাগরিকদের জানানো হয়, যা একটি বিচ্ছিন্ন অভিযোগকে দীর্ঘমেয়াদী নাগরিক উন্নয়নে পরিণত করে।",
    textEn: "Progress and results are shared with citizens, turning single complaints into long-term civic improvement.",
  },
];

export default function AboutPage() {
  const { t } = useLanguage();

  return (
    <main className="relative min-h-[calc(100dvh-5.5rem)] overflow-hidden px-3 pb-6 md:px-4 md:pb-8">
      <section className="relative mx-auto w-full max-w-6xl pt-6 md:pt-9">
        <div className="grid gap-5 md:grid-cols-[1.2fr_0.8fr] md:gap-6">
          <article className="rounded-[28px] border border-[#d7e0f0] bg-gradient-to-b from-[#ffffffef] to-[#f8fbffef] p-6 shadow-[0_24px_60px_#0f2b551c] backdrop-blur-[8px] md:p-9">
            <p className="inline-flex rounded-full border border-[#cfdbef] bg-[#f8fbff] px-3 py-1 text-[0.76rem] font-semibold uppercase tracking-[0.08em] text-[#3d5c86]">
              {t("সিটিজেন সম্পর্কে", "About CityZen")}
            </p>
            <h1 className="mt-4 text-[clamp(1.8rem,4vw,3rem)] font-extrabold leading-[1.1] text-[#0f172a]">
              {t(
                "পরিচ্ছন্ন, নিরাপদ এবং দায়িত্বশীল শহরের জন্য একটি স্মার্ট নাগরিক রিপোর্টিং ব্যবস্থা।",
                "A smart civic reporting platform for cleaner, safer, and more responsible cities.",
              )}
            </h1>
            <p className="mt-4 max-w-2xl text-[1rem] leading-relaxed text-[#334155] md:text-[1.06rem]">
              {t(
                "সিটিজেন একটি সমন্বিত প্ল্যাটফর্মের মাধ্যমে নাগরিক এবং নগর কর্তৃপক্ষের মধ্যে সেতুবন্ধন তৈরি করে। আমরা পরিষ্কার প্রমাণের ভিত্তিতে সমস্যাগুলো তুলে ধরতে এবং কর্তৃপক্ষকে সুশৃঙ্খলভাবে পদক্ষেপ নিতে সাহায্য করি।",
                "CityZen connects citizens and urban authorities through one unified platform. We make issues clear with evidence and help teams act in an organized way.",
              )}
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href="/"
                className="inline-flex min-h-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#1f4fd7] to-[#173ea8] px-4 py-2 font-semibold text-white transition hover:-translate-y-[1px] hover:shadow-[0_10px_22px_#12295a36]"
              >
                {t("ম্যাপ দেখুন", "View map")}
              </Link>
              <Link
                href="/community"
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#cad6ec] bg-white px-4 py-2 font-semibold text-[#23324a] transition hover:-translate-y-[1px] hover:bg-[#f7faff]"
              >
                {t("কমিউনিটিতে যোগ দিন", "Join community")}
              </Link>
            </div>
          </article>

          <aside className="grid gap-4">
            <div className="rounded-[24px] border border-[#d7e0f0] bg-white/90 p-5 shadow-[0_18px_42px_#16346117] backdrop-blur-[6px]">
              <p className="text-[0.8rem] font-semibold uppercase tracking-[0.08em] text-[#4b668d]">{t("আমাদের প্রভাব", "Our Impact")}</p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-[#dbe5f5] bg-[#f8fbff] p-3.5">
                  <p className="text-[1.45rem] font-extrabold text-[#143f9b]">{t("২৪/৭", "24/7")}</p>
                  <p className="mt-1 text-[0.85rem] text-[#3d4e66]">{t("রিপোর্টের অ্যাক্সেস", "Report access")}</p>
                </div>
                <div className="rounded-xl border border-[#dbe5f5] bg-[#f8fbff] p-3.5">
                  <p className="text-[1.45rem] font-extrabold text-[#143f9b]">{t("১টি ম্যাপ", "One map")}</p>
                  <p className="mt-1 text-[0.85rem] text-[#3d4e66]">{t("সবার জন্য দৃশ্যমান", "Visible to everyone")}</p>
                </div>
                <div className="rounded-xl border border-[#dbe5f5] bg-[#f8fbff] p-3.5">
                  <p className="text-[1.45rem] font-extrabold text-[#143f9b]">{t("দ্রুততর", "Faster")}</p>
                  <p className="mt-1 text-[0.85rem] text-[#3d4e66]">{t("সমস্যা সমাধান", "Issue resolution")}</p>
                </div>
                <div className="rounded-xl border border-[#dbe5f5] bg-[#f8fbff] p-3.5">
                  <p className="text-[1.45rem] font-extrabold text-[#143f9b]">{t("সুস্পষ্ট", "Clear")}</p>
                  <p className="mt-1 text-[0.85rem] text-[#3d4e66]">{t("পাবলিক আপডেট", "Public updates")}</p>
                </div>
              </div>
            </div>

            <div className="rounded-[24px] border border-[#d7e0f0] bg-gradient-to-br from-[#eef4ff] to-[#e6efff] p-5 shadow-[0_18px_42px_#16346114]">
              <p className="text-sm font-semibold text-[#1f3f85]">{t("সিটিজেন কেন?", "Why CityZen?")}</p>
              <p className="mt-2 text-[0.94rem] leading-relaxed text-[#2f4058]">
                {t(
                  "নাগরিকদের মতামত তখনই সবচেয়ে বেশি কার্যকর হয় যখন তা সুসংগঠিত, দৃশ্যমান এবং সহজেই পদক্ষেপ নেওয়ার যোগ্য হয়। আমাদের প্ল্যাটফর্মটি নাগরিক এবং স্থানীয় কর্তৃপক্ষ উভয়ের জন্যই এই প্রক্রিয়াটিকে সহজ ও বাস্তবসম্মত করতে ডিজাইন করা হয়েছে।",
                  "Citizen feedback becomes most effective when it is structured, visible, and ready for action. Our platform is designed to make this practical for both residents and local authorities.",
                )}
              </p>
            </div>
          </aside>
        </div>
      </section>

      <section className="relative mx-auto mt-6 w-full max-w-6xl rounded-[28px] border border-[#d7e0f0] bg-white/92 p-5 shadow-[0_24px_56px_#193b6b17] md:mt-8 md:p-7">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[0.8rem] font-semibold uppercase tracking-[0.08em] text-[#4b668d]">{t("আমাদের কার্যপ্রণালী", "How It Works")}</p>
            <h2 className="mt-1 text-[clamp(1.25rem,2.4vw,1.8rem)] font-bold text-[#0f172a]">{t("একটি স্বচ্ছ নাগরিক কার্যক্রমের চক্র", "A transparent civic action cycle")}</h2>
          </div>
          <Link href="/faq" className="text-sm font-semibold text-[#1f4fd7] transition hover:text-[#173ea8]">
            {t("সাধারণ জিজ্ঞাসা পড়ুন", "Read FAQ")} {"->"}
          </Link>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {milestones.map((item, index) => (
            <article key={item.phaseEn} className="rounded-2xl border border-[#dce6f7] bg-[#f8fbff] p-4">
              <p className="font-mono text-[0.75rem] tracking-[0.05em] text-[#4a6288]">{t("ধাপ", "Step")} {index + 1}</p>
              <h3 className="mt-1 text-lg font-bold text-[#102a5f]">{t(item.phaseBn, item.phaseEn)}</h3>
              <p className="mt-2 text-[0.95rem] leading-relaxed text-[#31435c]">{t(item.textBn, item.textEn)}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="relative mx-auto mt-6 w-full max-w-6xl md:mt-8">
        <div className="mb-4">
          <p className="text-[0.8rem] font-semibold uppercase tracking-[0.08em] text-[#4b668d]">{t("আমাদের মূলনীতি", "Our Principles")}</p>
          <h2 className="mt-1 text-[clamp(1.25rem,2.4vw,1.8rem)] font-bold text-[#0f172a]">{t("বিশ্বাস, স্বচ্ছতা এবং গতির জন্য নির্মিত", "Built for trust, transparency, and speed")}</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {values.map((item) => (
            <article
              key={item.titleEn}
              className="rounded-[22px] border border-[#d7e0f0] bg-gradient-to-b from-[#ffffffee] to-[#f7faffee] p-5 shadow-[0_16px_35px_#17346314] transition hover:-translate-y-[2px]"
            >
              <h3 className="text-[1.05rem] font-bold text-[#0e295f]">{t(item.titleBn, item.titleEn)}</h3>
              <p className="mt-2 text-[0.95rem] leading-relaxed text-[#344761]">{t(item.descriptionBn, item.descriptionEn)}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}