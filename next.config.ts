// FILE: next.config.ts
import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
    reactCompiler: true,
    devIndicators: false,

    // Allow accessing dev assets from LAN origin(s).
    allowedDevOrigins: ["192.168.2.123"],

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
