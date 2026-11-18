import {
  BackupError,
  snapshotTime,
  type BackupProvider,
} from '../lib/backup/provider.ts'

/** A bucket in memory, standing in for Supabase in tests. */
export function memoryBackup() {
  const snapshots = new Map<string, string>()
  const photos = new Map<string, Blob>()
  const uploads: string[] = []
  const provider: BackupProvider = {
    async check() {},
    async listSnapshots() {
      return [...snapshots]
        .map(([name, json]) => ({
          name,
          createdAt: snapshotTime(name)!,
          size: json.length,
        }))
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    },
    async putSnapshot(name, json) {
      snapshots.set(name, json)
    },
    async getSnapshot(name) {
      const json = snapshots.get(name)
      if (json === undefined) throw new BackupError('Not found')
      return json
    },
    async deleteSnapshots(names) {
      for (const name of names) snapshots.delete(name)
    },
    async listPhotos() {
      return new Set(photos.keys())
    },
    async putPhoto(key, photo) {
      uploads.push(key)
      photos.set(key, photo)
    },
    async getPhoto(key) {
      const photo = photos.get(key)
      if (photo === undefined) throw new BackupError('Not found')
      return photo
    },
  }
  return { provider, snapshots, photos, uploads }
}
