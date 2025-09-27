<<<<<<< HEAD
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
=======
import { Storage } from '@google-cloud/storage'

export class CloudStorageService {
  private storage: Storage
  private bucketName: string

  constructor() {
    this.storage = new Storage({
      projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
      keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
    })
    this.bucketName = process.env.GOOGLE_CLOUD_STORAGE_BUCKET!
  }

  async uploadSlideContent(
    presentationId: string,
    slideId: string,
    content: any,
    contentType = 'application/json'
  ): Promise<string> {
    try {
      const fileName = `presentations/${presentationId}/slides/${slideId}/content.json`
      const file = this.storage.bucket(this.bucketName).file(fileName)

      await file.save(JSON.stringify(content, null, 2), {
        metadata: {
          contentType,
        },
      })

      return `gs://${this.bucketName}/${fileName}`
    } catch (error) {
      console.error('Error uploading slide content:', error)
      throw new Error(`Failed to upload slide content: ${error}`)
    }
  }

  async uploadThumbnail(
    presentationId: string,
    slideId: string,
    thumbnailBuffer: Buffer,
    contentType = 'image/png'
  ): Promise<string> {
    try {
      const fileName = `presentations/${presentationId}/thumbnails/${slideId}.png`
      const file = this.storage.bucket(this.bucketName).file(fileName)

      await file.save(thumbnailBuffer, {
        metadata: {
          contentType,
        },
      })

      return `gs://${this.bucketName}/${fileName}`
    } catch (error) {
      console.error('Error uploading thumbnail:', error)
      throw new Error(`Failed to upload thumbnail: ${error}`)
    }
  }

  async downloadThumbnailFromUrl(url: string): Promise<Buffer> {
    try {
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`Failed to fetch thumbnail: ${response.statusText}`)
      }
      
      const arrayBuffer = await response.arrayBuffer()
      return Buffer.from(arrayBuffer)
    } catch (error) {
      console.error('Error downloading thumbnail:', error)
      throw new Error(`Failed to download thumbnail: ${error}`)
    }
  }

  async uploadPresentationMetadata(
    presentationId: string,
    metadata: any
  ): Promise<string> {
    try {
      const fileName = `presentations/${presentationId}/metadata.json`
      const file = this.storage.bucket(this.bucketName).file(fileName)

      await file.save(JSON.stringify(metadata, null, 2), {
        metadata: {
          contentType: 'application/json',
        },
      })

      return `gs://${this.bucketName}/${fileName}`
    } catch (error) {
      console.error('Error uploading metadata:', error)
      throw new Error(`Failed to upload metadata: ${error}`)
    }
  }

  async getSignedUrl(filePath: string, expirationMinutes = 60): Promise<string> {
    try {
      // Remove gs:// prefix if present
      const cleanPath = filePath.replace(`gs://${this.bucketName}/`, '')
      const file = this.storage.bucket(this.bucketName).file(cleanPath)

      const [signedUrl] = await file.getSignedUrl({
        action: 'read',
        expires: Date.now() + expirationMinutes * 60 * 1000,
      })

      return signedUrl
    } catch (error) {
      console.error('Error generating signed URL:', error)
      throw new Error(`Failed to generate signed URL: ${error}`)
    }
  }

  async deletePresentation(presentationId: string): Promise<void> {
    try {
      const prefix = `presentations/${presentationId}/`
      const [files] = await this.storage.bucket(this.bucketName).getFiles({
        prefix,
      })

      const deletePromises = files.map(file => file.delete())
      await Promise.all(deletePromises)
    } catch (error) {
      console.error('Error deleting presentation files:', error)
      throw new Error(`Failed to delete presentation files: ${error}`)
    }
  }

  async fileExists(filePath: string): Promise<boolean> {
    try {
      const cleanPath = filePath.replace(`gs://${this.bucketName}/`, '')
      const file = this.storage.bucket(this.bucketName).file(cleanPath)
      const [exists] = await file.exists()
      return exists
    } catch (error) {
      return false
    }
  }
}

export const gcs = new CloudStorageService()
>>>>>>> origin/alex-front-end
