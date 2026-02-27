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
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'LMS Platform',
  },
  icons: {
    icon: '/icons/icon-192.png',
    apple: '/icons/icon-152.png',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#FF7A1A',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={poppins.variable}>
      <body className="font-poppins antialiased">
          <ReduxProvider>{children}</ReduxProvider>
        </body>
    </html>
  );
}
