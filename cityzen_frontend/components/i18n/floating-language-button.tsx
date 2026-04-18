"use client";

import { useLanguage } from "@/components/i18n/language-context";

export function FloatingLanguageButton() {
  const { language, toggleLanguage } = useLanguage();
  const label = language === "bn" ? "English" : "বাংলা";

  return (
    <button
      type="button"
      onClick={toggleLanguage}
      aria-label="Toggle language"
      className="fixed right-4 top-4 z-[5000] rounded-xl border border-[#b7cae499] bg-[#ffffffd9] px-3 py-1.5 text-[0.78rem] font-semibold text-[#1f3f85] shadow-[0_8px_20px_#15284820] backdrop-blur-md transition hover:-translate-y-[1px] hover:bg-[#edf2fb]"
    >
      {label}
    </button>
  );
}
