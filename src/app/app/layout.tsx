import { BottomNav } from '@/components/BottomNav'
import { CloudSync } from '@/components/CloudSync'
import { AuthGate } from '@/components/AuthGate'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-container">
      <AuthGate>
        <main className="pb-safe">
          {children}
        </main>
        <BottomNav />
        <CloudSync />
      </AuthGate>
    </div>
  )
}
