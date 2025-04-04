
const nextConfig = {
  /* config options here */
  reactStrictMode: true,
  experimental: {
    turboMode: false,
  },
  webpack: (config) => {
    return config;
  },
};

export default nextConfig;
