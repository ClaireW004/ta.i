<<<<<<< HEAD
import { NextResponse } from "next/server"
import { db } from "@/lib/database"

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    const presentation = await db.getPresentation(id)
    if (!presentation) return NextResponse.json({ error: "Not found" }, { status: 404 })
    return NextResponse.json(presentation)
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed to fetch presentation' }, { status: 500 })
  }
}
=======
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { DatabaseService } from "@/lib/database"
import { CloudStorageService } from "@/lib/cloud-storage"

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check for authentication errors
    if (session.error) {
      console.log("🔄 Session has auth error:", session.error)
      return NextResponse.json({ 
        error: "Authentication error", 
        details: session.error 
      }, { status: 401 })
    }

    const presentationId = params.id
    if (!presentationId) {
      return NextResponse.json({ error: "Presentation ID required" }, { status: 400 })
    }

    const db = new DatabaseService()
    const storage = new CloudStorageService()
    
    // Get presentation details
    const presentation = await db.getPresentation(presentationId)
    if (!presentation) {
      return NextResponse.json({ error: "Presentation not found" }, { status: 404 })
    }

    // Check if user owns this presentation
    if (presentation.created_by !== session.user.email) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    // Get slides for this presentation
    const slides = await db.getPresentationSlides(presentationId)
    
    // Generate signed URLs for slide content if stored in GCS
    const slidesWithUrls = await Promise.all(
      slides.map(async (slide) => {
        let thumbnailUrl = slide.thumbnail_url
        let contentUrl = slide.gcs_content_path

        // Generate signed URLs if paths exist
        if (slide.gcs_thumbnail_path) {
          try {
            thumbnailUrl = await storage.getSignedUrl(slide.gcs_thumbnail_path, 3600) // 1 hour
          } catch (error) {
            console.warn(`Failed to generate thumbnail URL for slide ${slide.id}:`, error)
          }
        }

        if (slide.gcs_content_path) {
          try {
            contentUrl = await storage.getSignedUrl(slide.gcs_content_path, 3600) // 1 hour
          } catch (error) {
            console.warn(`Failed to generate content URL for slide ${slide.id}:`, error)
          }
        }

        return {
          ...slide,
          thumbnail_url: thumbnailUrl,
          content_url: contentUrl,
        }
      })
    )

    return NextResponse.json({
      success: true,
      presentation,
      slides: slidesWithUrls,
    })
  } catch (error) {
    console.error("Error fetching presentation:", error)
    return NextResponse.json(
      { error: "Failed to fetch presentation" },
      { status: 500 }
    )
  }
}
>>>>>>> origin/alex-front-end
