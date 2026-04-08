import type { Metadata } from 'next'
import '@/styles/globals.css'
import { Sidebar } from '@/components/layout/Sidebar'

export const metadata: Metadata = {
  title: 'AI 猎头助手平台',
  description: 'AI 猎头助手，技能驱动的智能招聘平台',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN">
      <body>
        <div className="h-screen w-screen p-6 flex gap-6">
          <Sidebar />
          <main className="flex-1 min-w-0 h-full overflow-hidden">
            {children}
          </main>
        </div>
      </body>
    </html>
  )
}
