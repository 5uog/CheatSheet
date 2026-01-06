// FILE: src/app/providers.tsx
"use client";

import { I18nProvider } from "@/app/shared/i18n/client";
import { ToastProvider } from "@/app/shared/ui/ToastProvider";

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <I18nProvider storageKey="pv_lang" defaultLang="ja">
            <ToastProvider>{children}</ToastProvider>
        </I18nProvider>
    );
}
