import type { Metadata } from 'next';
import { IBM_Plex_Mono } from 'next/font/google';
import './globals.css';

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-mono',
});

export const metadata: Metadata = {
  title: 'AI Startup Battlefield',
  description:
    'Build a startup. Survive the market. Convince the investors. Powered by 0G Compute + 0G Storage.',
  openGraph: {
    title: 'AI Startup Battlefield',
    description: 'A live AI startup simulation. Every agent is real. No scripted outcomes.',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={ibmPlexMono.variable}>
      <body className="bg-bg-base text-text-primary font-mono antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}
