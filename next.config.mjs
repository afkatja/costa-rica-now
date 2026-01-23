/** @type {import('next').NextConfig} */

import createNextIntlPlugin from "next-intl/plugin"
import withBundleAnalyzer from "@next/bundle-analyzer"

const nextConfig = {
  experimental: {
    taint: true,
    optimizePackageImports: ["gsap", "lucide-react"],
  },
  webpack: config => {
    config.module.rules.push({
      test: /\/supabase\/functions\//,
      loader: "null-loader",
      type: "javascript/auto",
    })
    return config
  },

  images: {
    qualities: [50, 75, 100],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "picsum.photos",
        port: "",
      },
      {
        protocol: "https",
        hostname: "static.vecteezy.com",
        port: "",
      },
      {
        protocol: "https",
        hostname: "openweathermap.org",
        port: "",
      },
      {
        protocol: "http",
        hostname: "**.wikipedia.org",
        port: "",
      },
      {
        protocol: "https",
        hostname: "**.wikipedia.org",
        port: "",
      },
      {
        protocol: "https",
        hostname: "**.wikimedia.org",
        port: "",
      },
    ],
  },
  async rewrites() {
    return [
      {
        source: "/robots.txt",
        destination: "/robots.txt",
      },
    ]
  },
}

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts")

const withBundleOptimizer = withBundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
})

export default withBundleOptimizer(withNextIntl(nextConfig))
