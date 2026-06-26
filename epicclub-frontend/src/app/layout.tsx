import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';

// ─── Metadata ─────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: {
    default: 'Epic Club Management System',
    template: '%s | Epic Club',
  },
  description:
    'A modern, secure management platform for Epic Club — tasks, committees, meetings, and analytics all in one place.',
  keywords: ['club management', 'task management', 'committees', 'meetings', 'Epic Club'],
  authors: [{ name: 'Epic Club' }],
  robots: 'noindex, nofollow', // internal app — prevent indexing
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
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        {/* Preconnect to Google Fonts for faster load */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
      </head>
      <body className="bg-background text-text-primary antialiased min-h-screen">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
