import fs from "fs"
import path from "path"

const STORAGE_ROOT = path.resolve(process.cwd(), "./.storage")
if (!fs.existsSync(STORAGE_ROOT)) fs.mkdirSync(STORAGE_ROOT, { recursive: true })

export const gcs = {
  async uploadFile(bucket: string | undefined, objectPath: string, buffer: Buffer) {
    // For local/dev: write to .storage/<objectPath>
    const out = path.join(STORAGE_ROOT, objectPath)
    const dir = path.dirname(out)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    await fs.promises.writeFile(out, buffer)
    return `file://${out}`
  },

  async deleteFile(bucket: string | undefined, objectPath: string) {
    const out = path.join(STORAGE_ROOT, objectPath)
    if (fs.existsSync(out)) await fs.promises.unlink(out)
  },

  async uploadPresentationMetadata(presentationId: string, metadata: any) {
    const out = path.join(STORAGE_ROOT, `presentations/${presentationId}/metadata.json`)
    const dir = path.dirname(out)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    await fs.promises.writeFile(out, JSON.stringify(metadata, null, 2), "utf-8")
    return `file://${out}`
  },

  // Placeholder functions used by google route
  async uploadSlideContent(presentationId: string, slideId: string, content: any) {
    const out = path.join(STORAGE_ROOT, `presentations/${presentationId}/slides/${slideId}.json`)
    const dir = path.dirname(out)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    await fs.promises.writeFile(out, JSON.stringify(content, null, 2), "utf-8")
    return `file://${out}`
  },

  async uploadThumbnail(presentationId: string, slideId: string, buffer: Buffer) {
    const out = path.join(STORAGE_ROOT, `presentations/${presentationId}/thumbnails/${slideId}.png`)
    const dir = path.dirname(out)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    await fs.promises.writeFile(out, buffer)
    return `file://${out}`
  },

  async downloadThumbnailFromUrl(url: string) {
    // naive: if url starts with file://, read it
    if (url.startsWith("file://")) {
      const p = url.replace("file://", "")
      return await fs.promises.readFile(p)
    }
    throw new Error("downloadThumbnailFromUrl not implemented for non-file URLs in dev")
  },
}
