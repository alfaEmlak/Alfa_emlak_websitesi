import createNextIntlPlugin from "next-intl/plugin";
import type { NextConfig } from "next";

const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  images: {
    qualities: [25, 50, 75, 100],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "edioisowmuhhipefyoqq.supabase.co",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "**.101evler.com",
        pathname: "/**",
      },
    ],
  },
};

export default withNextIntl(nextConfig);
