import { google } from 'googleapis'
import { OAuth2Client } from 'google-auth-library'

export interface SlideContent {
  slideId: string
  title?: string
  content: string
  speakerNotes?: string
  thumbnailUrl?: string
  elements: SlideElement[]
}

export interface SlideElement {
  type: 'text' | 'image' | 'shape'
  content: string
  position?: {
    x: number
    y: number
    width: number
    height: number
  }
}

export interface PresentationMetadata {
  id: string
  title: string
  slideCount: number
  createdDate?: string
  modifiedDate?: string
  thumbnailUrl?: string
  locale?: string
}

export class GoogleSlidesService {
  private oauth2Client: OAuth2Client
  private slides: any

  constructor(accessToken: string) {
    this.oauth2Client = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    )
    
    this.oauth2Client.setCredentials({
      access_token: accessToken,
    })

    this.slides = google.slides({ version: 'v1', auth: this.oauth2Client })
  }

  async getPresentation(presentationId: string): Promise<{ metadata: PresentationMetadata; slides: SlideContent[] }> {
    try {
      // Get presentation metadata and slides
      const response = await this.slides.presentations.get({
        presentationId,
      })

      const presentation = response.data
      
      const metadata: PresentationMetadata = {
        id: presentation.presentationId!,
        title: presentation.title || 'Untitled Presentation',
        slideCount: presentation.slides?.length || 0,
        locale: presentation.locale,
      }

      // Extract slide content
      const slides: SlideContent[] = []
      
      for (const slide of presentation.slides || []) {
        const slideContent = await this.extractSlideContent(slide)
        slides.push(slideContent)
      }

      return { metadata, slides }
    } catch (error) {
      console.error('Error fetching presentation:', error)
      throw new Error(`Failed to fetch presentation: ${error}`)
    }
  }

  private async extractSlideContent(slide: any): Promise<SlideContent> {
    const slideId = slide.objectId
    let title = ''
    let content = ''
    let speakerNotes = ''
    const elements: SlideElement[] = []

    // Extract page elements (text, images, shapes)
    if (slide.pageElements) {
      for (const element of slide.pageElements) {
        if (element.shape?.text?.textElements) {
          const textContent = this.extractTextFromElement(element.shape.text.textElements)
          
          // Determine if this is a title (usually the first large text element)
          if (!title && textContent.length > 0) {
            title = textContent
          } else if (textContent.length > 0) {
            content += textContent + '\n'
          }

          elements.push({
            type: 'text',
            content: textContent,
            position: element.transform ? {
              x: element.transform.translateX || 0,
              y: element.transform.translateY || 0,
              width: element.size?.width?.magnitude || 0,
              height: element.size?.height?.magnitude || 0,
            } : undefined,
          })
        }
        
        // Handle images
        if (element.image) {
          elements.push({
            type: 'image',
            content: element.image.contentUrl || '',
            position: element.transform ? {
              x: element.transform.translateX || 0,
              y: element.transform.translateY || 0,
              width: element.size?.width?.magnitude || 0,
              height: element.size?.height?.magnitude || 0,
            } : undefined,
          })
        }
      }
    }

    // Extract speaker notes
    if (slide.slideProperties?.notesPage?.pageElements) {
      for (const element of slide.slideProperties.notesPage.pageElements) {
        if (element.shape?.text?.textElements) {
          speakerNotes += this.extractTextFromElement(element.shape.text.textElements) + '\n'
        }
      }
    }

    return {
      slideId,
      title: title || `Slide ${slideId}`,
      content: content.trim(),
      speakerNotes: speakerNotes.trim(),
      elements,
    }
  }

  private extractTextFromElement(textElements: any[]): string {
    let text = ''
    for (const textElement of textElements) {
      if (textElement.textRun?.content) {
        text += textElement.textRun.content
      }
    }
    return text.trim()
  }

  async getThumbnail(presentationId: string, slideId?: string): Promise<string | null> {
    try {
      const response = await this.slides.presentations.pages.getThumbnail({
        presentationId,
        pageObjectId: slideId,
        'thumbnailProperties.thumbnailSize': 'LARGE',
        'thumbnailProperties.mimeType': 'PNG',
      })

      return response.data.contentUrl || null
    } catch (error) {
      console.error('Error fetching thumbnail:', error)
      return null
    }
  }
}