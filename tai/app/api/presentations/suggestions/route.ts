import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

interface SuggestionRequest {
  presentationId: string
  currentSlideIndex: number
  slideContent?: string
  speakerNotes?: string
}

interface AISuggestion {
  type: "speaking_tip" | "content_enhancement" | "timing" | "data_presentation" | "audience_engagement"
  title: string
  content: string
  priority: "low" | "medium" | "high"
}

// Mock AI service - in production this would call an actual AI API
class MockAIService {
  generateSuggestions(slideContent: string, speakerNotes?: string): AISuggestion[] {
    const suggestions: AISuggestion[] = []

    // Analyze content and generate contextual suggestions
    if (slideContent.toLowerCase().includes("data") || slideContent.toLowerCase().includes("chart")) {
      suggestions.push({
        type: "data_presentation",
        title: "Data Visualization Tip",
        content: "When presenting data, highlight the key insight first, then explain the supporting details. Use the 'So what?' test for each data point.",
        priority: "high"
      })
    }

    if (slideContent.toLowerCase().includes("problem") || slideContent.toLowerCase().includes("challenge")) {
      suggestions.push({
        type: "content_enhancement",
        title: "Problem Framing",
        content: "Consider using the SCQA framework: Situation, Complication, Question, Answer. This helps your audience understand why this problem matters.",
        priority: "medium"
      })
    }

    if (slideContent.length > 200) {
      suggestions.push({
        type: "speaking_tip",
        title: "Content Density",
        content: "This slide has dense content. Consider breaking it into key points and elaborate verbally rather than reading directly from the slide.",
        priority: "medium"
      })
    }

    if (!speakerNotes || speakerNotes.length < 50) {
      suggestions.push({
        type: "speaking_tip",
        title: "Speaker Notes",
        content: "Add more detailed speaker notes to help you remember key points, stories, or transitions for this slide.",
        priority: "low"
      })
    }

    // Add some general suggestions
    suggestions.push({
      type: "audience_engagement",
      title: "Engagement Opportunity",
      content: "Consider asking a rhetorical question or sharing a brief relevant example to keep your audience engaged at this point.",
      priority: "medium"
    })

    suggestions.push({
      type: "timing",
      title: "Pacing Reminder",
      content: "Remember to pause after key points to let important information sink in. Aim for 2-3 minutes per slide depending on complexity.",
      priority: "low"
    })

    return suggestions
  }
}

export async function POST(request: NextRequest) {
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

    const body: SuggestionRequest = await request.json()
    const { presentationId, currentSlideIndex, slideContent, speakerNotes } = body

    if (!presentationId || currentSlideIndex === undefined) {
      return NextResponse.json({ 
        error: "Missing required fields: presentationId, currentSlideIndex" 
      }, { status: 400 })
    }

    // Initialize mock AI service
    const aiService = new MockAIService()
    
    // Generate suggestions based on slide content
    const suggestions = aiService.generateSuggestions(
      slideContent || "", 
      speakerNotes
    )

    return NextResponse.json({
      success: true,
      suggestions,
      slideIndex: currentSlideIndex,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Error generating AI suggestions:", error)
    return NextResponse.json(
      { error: "Failed to generate suggestions" },
      { status: 500 }
    )
  }
}