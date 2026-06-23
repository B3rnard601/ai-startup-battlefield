/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // 0G Storage SDK uses Node.js modules — stub them for client bundles
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        path: false,
        os: false,
        stream: false,
        buffer: false,
      };
    }
    return config;
  },
  // Increase API timeout for 0G Storage uploads
  experimental: {
    serverComponentsExternalPackages: ['@0gfoundation/0g-storage-ts-sdk'],
  },
};

export default nextConfig;
