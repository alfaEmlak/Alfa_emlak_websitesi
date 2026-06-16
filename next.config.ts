import createNextIntlPlugin from "next-intl/plugin";
import type { NextConfig } from "next";

const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  images: {
    qualities: [25, 50, 75, 100],
    // AVIF + WebP: orijinal JPEG/PNG'lere kıyasla çok daha küçük çıktı.
    formats: ["image/avif", "image/webp"],
    // Optimize edilen görseller 31 gün cache'lensin (PageSpeed "verimli önbellek" önerisi).
    minimumCacheTTL: 2678400,
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
  async headers() {
    return [
      {
        // public/ altındaki statik görseller uzun süreli, immutable cache.
        source: "/:all*(svg|jpg|jpeg|png|webp|avif|gif|ico)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
