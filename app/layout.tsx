import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Lebas Driver Desk',
  description: 'Driver route map and pickups',
  robots: { index: false, follow: false },
  icons: { icon: 'https://lebbas.com/logo.png', apple: 'https://lebbas.com/logo.png' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#065a3c',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="text-slate-900 antialiased">{children}</body>
    </html>
  );
}
