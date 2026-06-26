import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ['y-monaco', 'y-protocols', 'yjs'],
};

export default nextConfig;
