import type { Metadata } from 'next';

import { AuthProvider } from '@/lib/auth-context';
import './globals.css';

export const metadata: Metadata = {
  title: 'PetMedi - 동물병원 통합 의료 플랫폼',
  description: '동물병원 EMR/PMS 통합 솔루션. 진료기록 공유, 동물 고유코드 시스템으로 어디서든 연속적인 진료가 가능합니다.',
  keywords: ['동물병원', 'EMR', 'PMS', '진료기록', '반려동물', '수의사'],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans antialiased">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
