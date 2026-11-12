import { switchUiVersion } from '../../state/useSettings.ts'

export default function App() {
  return (
    <main>
      <p>The new interface is on its way.</p>
      <button type="button" onClick={() => switchUiVersion('v1')}>
        Back to v1
      </button>
    </main>
  )
}
