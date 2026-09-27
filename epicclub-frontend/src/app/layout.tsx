import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';

// ─── Metadata ─────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: {
    default: 'EPIC OFFICE — نظام إدارة نادي EPIC Club',
    template: '%s | EPIC OFFICE',
  },
  description:
    'نظام تشغيل وإدارة نادي EPIC Club — إدارة الأعضاء، اللجان، المهام، والاجتماعات في مساحة واحدة متكاملة.',
  keywords: ['EPIC Club', 'إدارة النادي', 'لوحة التحكم', 'المهام', 'الاجتماعات'],
  authors: [{ name: 'EPIC Club' }],
  robots: 'noindex, nofollow',
  icons: {
    icon: '/favicon.ico',
  },
};

// ─── Root Layout ──────────────────────────────────────────────────────────────

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl" className="light" suppressHydrationWarning>
      <head>
        {/* Preconnect to Google Fonts for Cairo & Plus Jakarta Sans */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-background text-text-primary font-cairo antialiased min-h-screen">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
