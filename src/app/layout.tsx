import type { Metadata, Viewport } from 'next';
import { Poppins } from 'next/font/google';
import ReduxProvider from '@/store/provider';
import './globals.css';

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-poppins',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'LMS Platform',
  description: 'Learning Management System for organizational training and development',
  manifest: '/manifest.json',
  applicationName: 'LMS Platform',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'LMS Platform',
    startupImage: '/icons/icon-512x512.png',
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: '/icons/icon-96x96.png', sizes: '32x32', type: 'image/png' },
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: [
      { url: '/icons/icon-152x152.png', sizes: '152x152' },
      { url: '/icons/icon-192x192.png', sizes: '180x180' },
    ],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#FF7A1A',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={poppins.variable}>
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="msapplication-TileColor" content="#FF7A1A" />
      </head>
      <body className="font-poppins antialiased">
        <ReduxProvider>{children}</ReduxProvider>
      </body>
    </html>
  );
}
