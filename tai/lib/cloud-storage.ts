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