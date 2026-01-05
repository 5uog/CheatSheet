// FILE: next.config.ts
import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
    reactCompiler: true,
    devIndicators: false,
    turbopack: {
        resolveAlias: {
            "@": path.join(process.cwd(), "src"),
        },
    },
    webpack: (config) => {
        config.resolve = config.resolve ?? {};
        config.resolve.alias = config.resolve.alias ?? {};
        config.resolve.alias["@"] = path.join(process.cwd(), "src");
        return config;
    },
};

export default nextConfig;
