// FILE: src/app/layout.tsx
import "./globals.css";
import { Providers } from "@/app/providers";

export const metadata = {
    title: "Local Question DB",
    description: "Local SQLite (FTS5) question database",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="ja">
            <body>
                <Providers>{children}</Providers>
            </body>
        </html>
    );
}
