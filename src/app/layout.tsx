import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/Providers'

const inter = Inter({ variable: '--font-inter', subsets: ['latin', 'vietnamese'] })

export const metadata: Metadata = {
  title: 'EduManager - Quản lý lớp học',
  description: 'Quản lý giáo viên, môn, lớp, học sinh, điểm danh, điểm số và học phí',
}

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="vi" className={inter.variable}>
      <body className="font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
