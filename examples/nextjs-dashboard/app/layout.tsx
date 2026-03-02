import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'HeyLol Dashboard',
  description: 'Example Next.js dashboard using @heylol/adapter-vercel',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
