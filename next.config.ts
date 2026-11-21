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
  register: true,
  publicExcludes: ['!noprecache/**/*', '!images/**/*', '!fonts/**/*'],
  workboxOptions: {
    // Skip generated API chunks and fonts the current page doesn't preload.
    manifestTransforms: [async (entries) => ({
      manifest: entries.filter(({ url }) =>
        !url.includes('/static/chunks/app/api/') &&
        (!url.endsWith('.woff2') || url.endsWith('.p.woff2')),
      ),
      warnings: [],
    })],
    // Customer notes, auth responses and private references must never be cached offline.
    runtimeCaching: [{ urlPattern: /^https?:\/\/[^/]+\/api\//, handler: 'NetworkOnly' }],
  }
})(nextConfig)
