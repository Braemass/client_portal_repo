/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // (We're using Webpack, not Turbopack)
  webpack: (config) => {
    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      // Force the modern ESM entry that includes multipart
      '@supabase/storage-js': '@supabase/storage-js/dist/module/index.js',
    };
    return config;
  },
};

export default nextConfig;

