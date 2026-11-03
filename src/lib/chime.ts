/** Two short soft tones, made with Web Audio (no sound files). Silent if unsupported. */
export function playChime(): void {
  try {
    const context = new AudioContext()
    ;[880, 1175].forEach((frequency, i) => {
      const at = context.currentTime + i * 0.25
      const oscillator = context.createOscillator()
      const gain = context.createGain()
      oscillator.type = 'sine'
      oscillator.frequency.value = frequency
      gain.gain.setValueAtTime(0.0001, at)
      gain.gain.exponentialRampToValueAtTime(0.2, at + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.4)
      oscillator.connect(gain).connect(context.destination)
      oscillator.start(at)
      oscillator.stop(at + 0.45)
    })
    setTimeout(() => void context.close(), 1000)
  } catch {
    // No Web Audio (or blocked): the phase still changes, just quietly.
  }
}
