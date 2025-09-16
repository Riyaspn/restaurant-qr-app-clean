const withPWA = require('@ducanh2912/next-pwa').default({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
});

/** @type {import('next').NextConfig} */
const isNative = process.env.NATIVE_BUILD === '1';

const nextConfig = withPWA({
  output: isNative ? 'export' : undefined,
  images: { unoptimized: true },
  reactStrictMode: true,
  trailingSlash: true,
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },

  webpack: (config, { webpack }) => {
    config.plugins.push(
      new webpack.DefinePlugin({
        'process.env.NATIVE_BUILD': JSON.stringify(isNative ? '1' : ''),
      }),
    );
    return config;
  },

  async redirects() {
    if (!isNative) return [];
    return [{ source: '/', destination: '/owner/orders', permanent: false }];
  },
});

module.exports = nextConfig;
