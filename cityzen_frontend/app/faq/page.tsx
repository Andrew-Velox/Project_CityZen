"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getFaqs } from "@/lib/api/faq";
import type { FaqItem } from "@/lib/api/types";
import { useLanguage } from "@/components/providers/language-provider";

type FaqItemViewProps = {
  item: FaqItem;
  isOpen: boolean;
  onToggle: () => void;
  categoryLabel: string;
};

function FaqItemView({ item, isOpen, onToggle, categoryLabel }: FaqItemViewProps) {
  return (
    <article className="overflow-hidden rounded-2xl border border-[#d6e2f5] bg-white/95 shadow-[0_12px_35px_#193b6b12]">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-start justify-between gap-4 px-5 py-4 text-left transition hover:bg-[#f8fbff]"
      >
        <div className="space-y-2">
          <span className="inline-flex rounded-full border border-[#d8e4fb] bg-[#f2f7ff] px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.08em] text-[#32508a]">
            {categoryLabel}
          </span>
          <h3 className="text-[1rem] font-bold leading-relaxed text-[#0f2a5d] md:text-[1.06rem]">{item.question}</h3>
        </div>
        <span
          className={`mt-[2px] inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#eaf1ff] text-lg font-semibold text-[#1f4fd7] transition-transform ${
            isOpen ? "rotate-45" : "rotate-0"
          }`}
        >
          +
        </span>
      </button>

      {isOpen && (
        <div className="border-t border-[#e2eaf8] px-5 py-4">
          <p className="whitespace-pre-line text-[0.96rem] leading-relaxed text-[#334155]">{item.answer}</p>
        </div>
      )}
    </article>
  );
}

export default function FaqPage() {
  const { t } = useLanguage();
  const [faqs, setFaqs] = useState<FaqItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<number | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<"all" | FaqItem["category"]>("all");

  useEffect(() => {
    let mounted = true;

    async function loadFaqs() {
      setLoading(true);
      setError(null);

      try {
        const data = await getFaqs();
        if (!mounted) return;
        setFaqs(data);
        setOpenId(data[0]?.id ?? null);
      } catch (err) {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : t("FAQ লোড করা যায়নি।", "Failed to load FAQ."));
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadFaqs();
    return () => {
      mounted = false;
    };
  }, [t]);

  const categoryLabelMap: Record<FaqItem["category"], string> = {
    general: t("সাধারণ", "General"),
    account: t("অ্যাকাউন্ট", "Account"),
    reporting: t("রিপোর্টিং", "Reporting"),
    community: t("কমিউনিটি", "Community"),
    technical: t("টেকনিক্যাল", "Technical"),
  };

  const title = useMemo(() => {
    if (loading) return t("সাধারণ জিজ্ঞাসা লোড হচ্ছে...", "Loading frequently asked questions...");
    return t("সাধারণ জিজ্ঞাসা (FAQ)", "Frequently Asked Questions (FAQ)");
  }, [loading, t]);

  const categoryTabs = useMemo(() => {
    const categories = Array.from(new Set(faqs.map((item) => item.category)));
    return ["all", ...categories] as Array<"all" | FaqItem["category"]>;
  }, [faqs]);

  const visibleFaqs = useMemo(() => {
    if (selectedCategory === "all") return faqs;
    return faqs.filter((item) => item.category === selectedCategory);
  }, [faqs, selectedCategory]);

  useEffect(() => {
    setOpenId(visibleFaqs[0]?.id ?? null);
  }, [selectedCategory, visibleFaqs]);

  return (
    <main className="relative min-h-[calc(100dvh-5.5rem)] overflow-hidden px-3 pb-6 md:px-4 md:pb-8">
      <section className="relative mx-auto w-full max-w-5xl pt-6 md:pt-9">
        <article className="rounded-[28px] border border-[#d7e0f0] bg-gradient-to-b from-[#ffffffef] to-[#f8fbffef] p-6 shadow-[0_24px_60px_#0f2b551c] backdrop-blur-[8px] md:p-9">
          <p className="inline-flex rounded-full border border-[#cfdbef] bg-[#f8fbff] px-3 py-1 text-[0.76rem] font-semibold uppercase tracking-[0.08em] text-[#3d5c86]">
            {t("সহায়তা কেন্দ্র", "Help Center")}
          </p>
          <h1 className="mt-4 text-[clamp(1.75rem,3.8vw,2.6rem)] font-extrabold leading-[1.1] text-[#0f172a]">
            {title}
          </h1>
          <p className="mt-3 max-w-2xl text-[1rem] leading-relaxed text-[#334155] md:text-[1.06rem]">
            {t(
              "CityZen ব্যবহার, রিপোর্ট করা, প্রোফাইল এবং কমিউনিটি বিষয়ে দ্রুত উত্তর পেতে নিচের প্রশ্নগুলো দেখুন।",
              "Find quick answers about using CityZen, reporting issues, profile management, and community features.",
            )}
          </p>
        </article>
      </section>

      <section className="relative mx-auto mt-6 grid w-full max-w-5xl gap-4 md:mt-8">
        {!loading && !error && categoryTabs.length > 1 && (
          <div className="flex flex-wrap gap-2">
            {categoryTabs.map((category) => {
              const isActive = selectedCategory === category;
              const label = category === "all" ? t("সব", "All") : categoryLabelMap[category];

              return (
                <button
                  key={category}
                  type="button"
                  onClick={() => setSelectedCategory(category)}
                  className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${
                    isActive
                      ? "border-[#1f4fd7] bg-[#1f4fd7] text-white"
                      : "border-[#d6e2f5] bg-white text-[#35527f] hover:border-[#b7c9ea]"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        )}

        {loading && (
          <div className="rounded-2xl border border-[#d6e2f5] bg-white/95 px-5 py-6 text-sm font-medium text-[#385175] shadow-[0_12px_35px_#193b6b12]">
            {t("FAQ তথ্য আনা হচ্ছে...", "Fetching FAQ data...")}
          </div>
        )}

        {!loading && error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        {!loading && !error && visibleFaqs.length === 0 && (
          <div className="rounded-2xl border border-[#d6e2f5] bg-white/95 px-5 py-6 text-sm font-medium text-[#385175] shadow-[0_12px_35px_#193b6b12]">
            {t("এই ক্যাটাগরিতে এখনো কোনো FAQ যোগ করা হয়নি।", "No FAQ has been added to this category yet.")}
          </div>
        )}

        {!loading && !error &&
          visibleFaqs.map((item) => (
            <FaqItemView
              key={item.id}
              item={item}
              categoryLabel={categoryLabelMap[item.category]}
              isOpen={openId === item.id}
              onToggle={() => setOpenId((current) => (current === item.id ? null : item.id))}
            />
          ))}
      </section>

      <section className="relative mx-auto mt-6 w-full max-w-5xl rounded-3xl border border-[#d7e0f0] bg-white/92 p-5 shadow-[0_18px_40px_#193b6b14] md:mt-8 md:p-6">
        <h2 className="text-lg font-bold text-[#122a5d]">{t("আরও সাহায্য দরকার?", "Need more help?")}</h2>
        <p className="mt-2 text-sm leading-relaxed text-[#3a4d67]">
          {t(
            "আপনার প্রশ্নের উত্তর না পেলে রিপোর্ট ফিচার ব্যবহার করুন বা প্রোফাইল পেজ থেকে যোগাযোগের তথ্য আপডেট করে রাখুন।",
            "If you cannot find your answer, use the reporting feature or keep your contact details updated from your profile page.",
          )}
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href="/"
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#1f4fd7] to-[#173ea8] px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-[1px] hover:shadow-[0_10px_22px_#12295a36]"
          >
            {t("ম্যাপে যান", "Go to map")}
          </Link>
          <Link
            href="/about"
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#cad6ec] bg-white px-4 py-2 text-sm font-semibold text-[#23324a] transition hover:-translate-y-[1px] hover:bg-[#f7faff]"
          >
            {t("About পেজে ফিরে যান", "Back to About page")}
          </Link>
        </div>
      </section>
    </main>
  );
}
