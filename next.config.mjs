/** @type {import('next').NextConfig} */
const nextConfig = {
    eslint: {
        ignoreDuringBuilds: true,
    },
    images: {
        remotePatterns: [{ hostname: "assets.ppy.sh" }, { hostname: "yorunoken.s-ul.eu" }, { hostname: "cdn.discordapp.com" }, { hostname: "raw.githubusercontent.com" }],
    },
};

export default nextConfig;
