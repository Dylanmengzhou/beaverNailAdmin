import type { NextConfig } from 'next'
import withPWA from "@ducanh2912/next-pwa"
const isDev = process.env.NODE_ENV === 'development'
const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "telegraph-image-czf.pages.dev",
        port: "",
        pathname: "/**",
      },
    ],
  },
  // 你的其他配置
}

export default withPWA({
  dest: 'public',
  disable: isDev,
  register: true
})(nextConfig)