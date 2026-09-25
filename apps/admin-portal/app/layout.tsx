import type { Metadata } from 'next';
import { Navigation } from '../components/nav';
import './globals.css';

export const metadata: Metadata = {
  title: 'ParkSmart Web Portal',
  description:
    'Owner and Admin Management Portal for Smart Car Parking Pakistan',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-gray-50 min-h-screen text-gray-900 font-sans">
        <Navigation />
        <main className="max-w-7xl mx-auto px-6 py-8">{children}</main>
      </body>
    </html>
  );
}
