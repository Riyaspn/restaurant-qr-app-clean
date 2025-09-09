/** @type {import('next').NextConfig} */
const isNative = process.env.NATIVE_BUILD === '1';

const nextConfig = {
  // Produce static out/ only for native (Capacitor) builds
  output: isNative ? 'export' : undefined,            // Next 14+ replacement for `next export` [web:710][web:711],
  images: { unoptimized: true },                      // Needed for static export without Image Optimization API [web:708],
  reactStrictMode: true,
  trailingSlash: true,
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },

  webpack: (config, { webpack }) => {
    config.plugins.push(
      new webpack.DefinePlugin({
        'process.env.NATIVE_BUILD': JSON.stringify(isNative ? '1' : '')
      })
    );
    return config;
  },

  async redirects() {
    if (!isNative) return [];
    // When packaged as a native app, land on owner/orders
    return [{ source: '/', destination: '/owner/orders', permanent: false }];
  }
};

module.exports = nextConfig;
