import { BottomNav } from '@/components/BottomNav'
import { CloudSync } from '@/components/CloudSync'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-container">
      <main className="pb-safe">
        {children}
      </main>
      <BottomNav />
      <CloudSync />
    </div>
  )
}
