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
    serverComponentsExternalPackages: ['puppeteer-core', '@sparticuz/chromium', 'puppeteer', 'undici'],
  },
  env: {
    NEXT_PUBLIC_BUILD_SHA: (process.env.VERCEL_GIT_COMMIT_SHA || 'local').slice(0, 7),
    NEXT_PUBLIC_BUILD_TIME: new Date().toISOString(),
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = [
        ...(Array.isArray(config.externals) ? config.externals : []),
        'puppeteer',
        'puppeteer-core',
        '@sparticuz/chromium',
        'undici',
      ];
    }
    return config;
  },
};

module.exports = nextConfig;
