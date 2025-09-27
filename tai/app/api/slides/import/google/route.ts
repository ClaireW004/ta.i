import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { GoogleSlidesService } from "@/lib/google-slides"
import { db } from "@/lib/database"
import { gcs } from "@/lib/cloud-storage"

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    
    if (!session?.accessToken) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const { presentationId, url } = await request.json()

    if (!presentationId || !url) {
      return NextResponse.json({ error: "Missing presentationId or url" }, { status: 400 })
    }

    // Validate Google Slides URL and extract presentation ID
    const urlMatch = url.match(/\/presentation\/d\/([a-zA-Z0-9-_]+)/)
    const extractedPresentationId = urlMatch?.[1]
    
    if (!extractedPresentationId || extractedPresentationId !== presentationId) {
      return NextResponse.json({ error: "Invalid Google Slides URL" }, { status: 400 })
    }

    // Check if presentation already exists
    const existingPresentation = await db.getPresentation(presentationId)
    if (existingPresentation && existingPresentation.status === 'completed') {
      return NextResponse.json({
        id: existingPresentation.presentation_id,
        title: existingPresentation.title,
        slideCount: existingPresentation.slide_count,
        source: "google-slides",
        status: "completed",
        message: "Presentation already imported"
      })
    }

    // Initialize Google Slides service with user's access token
    const slidesService = new GoogleSlidesService(session.accessToken)

    try {
      // Fetch presentation data from Google Slides API
      const { metadata, slides } = await slidesService.getPresentation(presentationId)
      
      // Create or update presentation record
      const presentationRecord = existingPresentation 
        ? await db.updatePresentation(presentationId, {
            title: metadata.title,
            slide_count: metadata.slideCount,
            source_url: url,
            status: 'processing',
            gcs_bucket: process.env.GOOGLE_CLOUD_STORAGE_BUCKET,
            locale: metadata.locale,
          })
        : await db.createPresentation({
            presentation_id: presentationId,
            title: metadata.title,
            source_type: 'google-slides',
            source_url: url,
            slide_count: metadata.slideCount,
            created_by: session.user?.email || 'unknown',
            gcs_bucket: process.env.GOOGLE_CLOUD_STORAGE_BUCKET,
            locale: metadata.locale,
            status: 'processing',
          })

      // Process and store each slide
      const processedSlides = []
      
      for (let i = 0; i < slides.length; i++) {
        const slide = slides[i]
        
        try {
          // Store slide content in Google Cloud Storage
          const contentPath = await gcs.uploadSlideContent(
            presentationId,
            slide.slideId,
            {
              title: slide.title,
              content: slide.content,
              speakerNotes: slide.speakerNotes,
              elements: slide.elements,
            }
          )

          // Get and store thumbnail if available
          let thumbnailPath
          let thumbnailUrl
          
          try {
            thumbnailUrl = await slidesService.getThumbnail(presentationId, slide.slideId)
            
            if (thumbnailUrl) {
              const thumbnailBuffer = await gcs.downloadThumbnailFromUrl(thumbnailUrl)
              thumbnailPath = await gcs.uploadThumbnail(presentationId, slide.slideId, thumbnailBuffer)
            }
          } catch (thumbnailError) {
            console.warn(`Failed to process thumbnail for slide ${slide.slideId}:`, thumbnailError instanceof Error ? thumbnailError.message : thumbnailError)
            // Continue without thumbnail
          }

          // Store slide record in database
          const slideRecord = await db.createSlide({
            presentation_id: presentationRecord.id,
            slide_id: slide.slideId,
            slide_number: i + 1,
            title: slide.title,
            content: slide.content,
            speaker_notes: slide.speakerNotes,
            thumbnail_url: thumbnailUrl || undefined,
            gcs_content_path: contentPath,
            gcs_thumbnail_path: thumbnailPath,
          })

          // Store slide elements
          for (let j = 0; j < slide.elements.length; j++) {
            const element = slide.elements[j]
            await db.createSlideElement({
              slide_id: slideRecord.id,
              element_type: element.type,
              content: element.content,
              position_x: element.position?.x,
              position_y: element.position?.y,
              width: element.position?.width,
              height: element.position?.height,
              element_order: j,
            })
          }

          processedSlides.push({
            slideId: slide.slideId,
            title: slide.title,
            thumbnailUrl: thumbnailUrl,
          })

        } catch (slideError) {
          console.error(`Error processing slide ${slide.slideId}:`, slideError)
          // Continue with other slides even if one fails
        }
      }

      // Store presentation metadata in GCS
      await gcs.uploadPresentationMetadata(presentationId, {
        ...metadata,
        slides: processedSlides,
        importedAt: new Date().toISOString(),
        importedBy: session.user?.email,
      })

      // Update presentation status to completed
      await db.updatePresentation(presentationId, {
        status: 'completed',
      })

      // Return structured response
      return NextResponse.json({
        id: presentationId,
        title: metadata.title,
        slideCount: metadata.slideCount,
        source: "google-slides",
        status: "completed",
        slides: processedSlides,
        message: `Successfully imported ${processedSlides.length} slides`
      })

    } catch (apiError) {
      console.error("Google Slides API error:", apiError)
      
      // Update presentation status to error if we created/updated a record
      try {
        await db.updatePresentation(presentationId, {
          status: 'error',
        })
      } catch (dbError) {
        console.error("Failed to update presentation status:", dbError)
      }
      
      return NextResponse.json({ 
        error: "Failed to fetch presentation from Google Slides API",
        details: apiError instanceof Error ? apiError.message : "Unknown API error"
      }, { status: 500 })
    }

  } catch (error) {
    console.error("Google Slides import error:", error)
    return NextResponse.json({ 
      error: "Failed to import Google Slides presentation",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}
