// FILE: src/app/shared/i18n/client.ts
"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { DICT } from "@/app/shared/i18n/dict";
import type { I18nKey, Lang } from "@/app/shared/i18n/types";

function applyVars(template: string, vars?: Record<string, string | number>) {
    if (!vars) return template;
    return template.replace(/\{([a-zA-Z0-9_]+)\}/g, (_match, k: string) => String(vars[k] ?? `{${k}}`));
}

export type I18nCtx = {
    lang: Lang;
    setLang: (l: Lang) => void;
    t: (key: I18nKey, vars?: Record<string, string | number>) => string;
};

const I18nContext = createContext<I18nCtx | null>(null);

export function I18nProvider(props: { children: React.ReactNode; storageKey?: string; defaultLang?: Lang }) {
    const { children, storageKey = "pv_lang", defaultLang = "ja" } = props;

    const [lang, setLang] = useState<Lang>(defaultLang);

    useEffect(() => {
        try {
            const v = localStorage.getItem(storageKey);
            if (v === "ja" || v === "en") setLang(v);
        } catch {}
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        try {
            localStorage.setItem(storageKey, lang);
        } catch {}
    }, [lang, storageKey]);

    const api = useMemo<I18nCtx>(() => {
        return {
            lang,
            setLang,
            t(key, vars) {
                const s = DICT[lang]?.[key] ?? DICT.ja[key] ?? key;
                return applyVars(s, vars);
            },
        };
    }, [lang]);

    return React.createElement(I18nContext.Provider, { value: api }, children);
}

export function useI18n(): I18nCtx {
    const v = useContext(I18nContext);
    if (!v) {
        return {
            lang: "ja",
            setLang: (_l: Lang) => {
                void _l;
            },
            t: (k: I18nKey, vars?: Record<string, string | number>) => applyVars(DICT.ja[k] ?? k, vars),
        };
    }
    return v;
}
