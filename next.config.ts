import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    output: "standalone",
    images: {
        remotePatterns: [{ hostname: "assets.ppy.sh" }, { hostname: "yorunoken.s-ul.eu" }, { hostname: "cdn.discordapp.com" }, { hostname: "raw.githubusercontent.com" }],
    },
};

export default nextConfig;
