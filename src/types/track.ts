export interface Track {
  path: string // relative to the chosen folder, e.g. 'Lofi/rain-walk.mp3'
  name: string // 'rain-walk'
  folder: string // 'Lofi', or '' for the chosen folder itself
  open: () => Promise<File>
}
