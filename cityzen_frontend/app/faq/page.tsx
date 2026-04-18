"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getFaqs } from "@/lib/api/faq";
import type { FaqItem } from "@/lib/api/types";
import { useLanguage } from "@/components/i18n/language-context";

const categoryLabelMapBn: Record<FaqItem["category"], string> = {
  general: "সাধারণ",
  account: "অ্যাকাউন্ট",
  reporting: "রিপোর্টিং",
  community: "কমিউনিটি",
  technical: "টেকনিক্যাল",
};

const categoryLabelMapEn: Record<FaqItem["category"], string> = {
  general: "General",
  account: "Account",
  reporting: "Reporting",
  community: "Community",
  technical: "Technical",
};

type FaqItemViewProps = {
  item: FaqItem;
  isOpen: boolean;
  onToggle: () => void;
  categoryLabelMap: Record<FaqItem["category"], string>;
};

function FaqItemView({ item, isOpen, onToggle, categoryLabelMap }: FaqItemViewProps) {
  return (
    <article className="overflow-hidden rounded-2xl border border-[#d6e2f5] bg-white/95 shadow-[0_12px_35px_#193b6b12]">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-start justify-between gap-4 px-5 py-4 text-left transition hover:bg-[#f8fbff]"
      >
        <div className="space-y-2">
          <span className="inline-flex rounded-full border border-[#d8e4fb] bg-[#f2f7ff] px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.08em] text-[#32508a]">
            {categoryLabelMap[item.category]}
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
  const { language } = useLanguage();
  const [faqs, setFaqs] = useState<FaqItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<number | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<"all" | FaqItem["category"]>("all");

  const text =
    language === "bn"
      ? {
          loadError: "FAQ লোড করা যায়নি।",
          loadingTitle: "সাধারণ জিজ্ঞাসা লোড হচ্ছে...",
          title: "সাধারণ জিজ্ঞাসা (FAQ)",
          helpCenter: "সহায়তা কেন্দ্র",
          description: "CityZen ব্যবহার, রিপোর্ট করা, প্রোফাইল এবং কমিউনিটি বিষয়ে দ্রুত উত্তর পেতে নিচের প্রশ্নগুলো দেখুন।",
          all: "সব",
          fetching: "FAQ তথ্য আনা হচ্ছে...",
          empty: "এই ক্যাটাগরিতে এখনো কোনো FAQ যোগ করা হয়নি।",
          needMoreHelp: "আরও সাহায্য দরকার?",
          needMoreHelpDescription:
            "আপনার প্রশ্নের উত্তর না পেলে রিপোর্ট ফিচার ব্যবহার করুন বা প্রোফাইল পেজ থেকে যোগাযোগের তথ্য আপডেট করে রাখুন।",
          mapCta: "ম্যাপে যান",
          aboutCta: "About পেজে ফিরে যান",
        }
      : {
          loadError: "Failed to load FAQs.",
          loadingTitle: "Loading FAQs...",
          title: "Frequently Asked Questions (FAQ)",
          helpCenter: "Help Center",
          description: "Find quick answers about using CityZen, reporting issues, profile settings, and community features.",
          all: "All",
          fetching: "Fetching FAQ data...",
          empty: "No FAQs are available in this category yet.",
          needMoreHelp: "Need more help?",
          needMoreHelpDescription:
            "If your question is not answered here, use the report feature or keep your contact details updated from your profile page.",
          mapCta: "Go to Map",
          aboutCta: "Back to About",
        };

  const categoryLabelMap = language === "bn" ? categoryLabelMapBn : categoryLabelMapEn;

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
        setError(err instanceof Error ? err.message : text.loadError);
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
  }, []);

  const title = useMemo(() => {
    if (loading) return text.loadingTitle;
    return text.title;
  }, [loading, text.loadingTitle, text.title]);

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
            {text.helpCenter}
          </p>
          <h1 className="mt-4 text-[clamp(1.75rem,3.8vw,2.6rem)] font-extrabold leading-[1.1] text-[#0f172a]">
            {title}
          </h1>
          <p className="mt-3 max-w-2xl text-[1rem] leading-relaxed text-[#334155] md:text-[1.06rem]">
            {text.description}
          </p>
        </article>
      </section>

      <section className="relative mx-auto mt-6 grid w-full max-w-5xl gap-4 md:mt-8">
        {!loading && !error && categoryTabs.length > 1 && (
          <div className="flex flex-wrap gap-2">
            {categoryTabs.map((category) => {
              const isActive = selectedCategory === category;
              const label = category === "all" ? text.all : categoryLabelMap[category];

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
            {text.fetching}
          </div>
        )}

        {!loading && error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        {!loading && !error && visibleFaqs.length === 0 && (
          <div className="rounded-2xl border border-[#d6e2f5] bg-white/95 px-5 py-6 text-sm font-medium text-[#385175] shadow-[0_12px_35px_#193b6b12]">
            {text.empty}
          </div>
        )}

        {!loading && !error &&
          visibleFaqs.map((item) => (
            <FaqItemView
              key={item.id}
              item={item}
              isOpen={openId === item.id}
              categoryLabelMap={categoryLabelMap}
              onToggle={() => setOpenId((current) => (current === item.id ? null : item.id))}
            />
          ))}
      </section>

      <section className="relative mx-auto mt-6 w-full max-w-5xl rounded-3xl border border-[#d7e0f0] bg-white/92 p-5 shadow-[0_18px_40px_#193b6b14] md:mt-8 md:p-6">
        <h2 className="text-lg font-bold text-[#122a5d]">{text.needMoreHelp}</h2>
        <p className="mt-2 text-sm leading-relaxed text-[#3a4d67]">
          {text.needMoreHelpDescription}
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href="/"
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#1f4fd7] to-[#173ea8] px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-[1px] hover:shadow-[0_10px_22px_#12295a36]"
          >
            {text.mapCta}
          </Link>
          <Link
            href="/about"
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#cad6ec] bg-white px-4 py-2 text-sm font-semibold text-[#23324a] transition hover:-translate-y-[1px] hover:bg-[#f7faff]"
          >
            {text.aboutCta}
          </Link>
        </div>
      </section>
    </main>
  );
}
