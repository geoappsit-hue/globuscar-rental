/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
    serverComponentsExternalPackages: ['puppeteer-core', '@sparticuz/chromium', 'puppeteer'],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = [
        ...((config.externals as any[]) || []),
        'puppeteer',
        'puppeteer-core',
        '@sparticuz/chromium',
      ];
    }
    return config;
  },
};

module.exports = nextConfig;
