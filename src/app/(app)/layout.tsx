import { Shell } from '@/components/Shell'
import { MeProvider } from '@/lib/me'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <MeProvider><Shell>{children}</Shell></MeProvider>
}
