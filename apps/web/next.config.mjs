/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  transpilePackages: ["@repo/ui"],
  experimental: {
    optimizeCss: true,
  },
};

export default config;
