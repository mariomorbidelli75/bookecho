import { BottomNav } from '@/components/BottomNav'
import { SideNav } from '@/components/SideNav'
import { ContentFrame } from '@/components/ContentFrame'
import { CloudSync } from '@/components/CloudSync'
import { AuthGate } from '@/components/AuthGate'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-shell">
      <AuthGate>
        <SideNav />
        <main className="pb-safe md:pl-60">
          <ContentFrame>{children}</ContentFrame>
        </main>
        <BottomNav />
        <CloudSync />
      </AuthGate>
    </div>
  )
}
