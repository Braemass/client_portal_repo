// next.config.mjs
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // ensures Next bundles ESM deps correctly in the client
    esmExternals: true,
  },
  // forces Next to transpile storage-js so tree-shaking doesn't drop multipart
  transpilePackages: ['@supabase/storage-js'],
};

export default nextConfig;

