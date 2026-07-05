/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Skip ESLint errors during production build (warnings only)
  eslint: {
    ignoreDuringBuilds: true,
  },

  // Skip TypeScript type errors during production build
  typescript: {
    ignoreBuildErrors: true,
  },

  // Note: 'standalone' output removed — Vercel handles bundling natively.

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://accounts.google.com", // unsafe-eval needed for Next.js dev, accounts.google.com for Google GSI
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://accounts.google.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: blob: https: https://images.unsplash.com",
              "connect-src 'self' http://localhost:5000 https://api.epicclub.com https://accounts.google.com https://epic-office.vercel.app https://*.vercel.app https://qkxxmwgdpgwakxnfyabj.supabase.co https://*.supabase.co",
              "frame-src 'self' https://accounts.google.com",
              "frame-ancestors 'self'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join('; '),
          },
        ],
      },
    ];
  },

  // Allow next/image to load images from external domains
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
    ],
  },

  // Proxy API calls to backend in development
  async rewrites() {
    return process.env.NODE_ENV === 'development'
      ? [
          {
            source: '/api/:path*',
            destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/:path*`,
          },
        ]
      : [];
  },
};

module.exports = nextConfig;
