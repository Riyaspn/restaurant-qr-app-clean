/** @type {import('next').NextConfig} */
const isNative = process.env.NATIVE_BUILD === '1';

const nextConfig = {
  output: isNative ? 'export' : undefined,  // only export for native builds [web:463][web:470]
  reactStrictMode: true,
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  images: { unoptimized: true },
  trailingSlash: true,
  // Optional: redirect dynamic/SSR routes to a static placeholder during native export
  async redirects() {
    if (!isNative) return [];
    return [
      { source: '/order/bills', destination: '/faq', permanent: false },        // temporary [web:463]
      { source: '/restaurants/:id', destination: '/site', permanent: false },   // temporary [web:463]
    ];
  },
};

module.exports = nextConfig;
