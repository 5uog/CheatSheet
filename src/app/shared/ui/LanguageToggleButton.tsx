// FILE: src/app/shared/ui/LanguageToggleButton.tsx
"use client";

import { useI18n } from "@/app/shared/i18n/client";

export function LanguageToggleButton(props: { className?: string }) {
    const { className } = props;
    const { lang, setLang, t } = useI18n();

    return (
        <div className={className}>
            <button
                type="button"
                onClick={() => setLang(lang === "ja" ? "en" : "ja")}
                className="rounded-xl border border-zinc-800 bg-zinc-950/40 px-3 py-2 text-xs text-zinc-200 hover:bg-zinc-950/70"
                aria-label={t("app.lang")}
                title={t("app.lang")}
            >
                {lang === "ja" ? t("app.lang.en") : t("app.lang.ja")}
            </button>
        </div>
    );
}
