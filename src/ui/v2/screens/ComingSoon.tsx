import { Sparkles } from 'lucide-react'
import { Card, ScreenBody, ScreenHeader } from '../components/Card.tsx'

/** Placeholder for screens still being built. */
export function ComingSoon({ title }: { title: string }) {
  return (
    <ScreenBody>
      <ScreenHeader title={title} />
      <Card>
        <p className="empty">
          <Sparkles size={18} aria-hidden="true" /> This screen is being
          redesigned. Until then, you can use it in the original interface
          (Settings → turn off “Use the new interface”).
        </p>
      </Card>
    </ScreenBody>
  )
}
