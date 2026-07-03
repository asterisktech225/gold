/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Prevent Next.js from bundling native addons — they must load from node_modules at runtime
    serverComponentsExternalPackages: ["better-sqlite3"],
  },
  images: {
    remotePatterns: [{ protocol: "http", hostname: "**" }, { protocol: "https", hostname: "**" }],
  },
};
module.exports = nextConfig;
