import type { NextConfig } from "next";
import { createMDX } from "fumadocs-mdx/next";

const nextConfig: NextConfig = {
  output: "standalone",
  reactStrictMode: true,
  poweredByHeader: false,
  serverExternalPackages: ["@aws-sdk/client-s3"],
  experimental: {
    staleTimes: {
      dynamic: 30,
      static: 180,
    },
    optimizePackageImports: ["lucide-react", "framer-motion"],
  },
};

const withMDX = createMDX();

export default withMDX(nextConfig);
