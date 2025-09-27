import { type NextRequest, NextResponse } from "next/server"
import { generateObject } from "ai"
import { z } from "zod"

const focusAnalysisSchema = z.object({
  semanticAlignment: z.number().min(0).max(100).describe("How well the transcript aligns with slide content (0-100)"),
  keyPointsCovered: z.array(z.string()).describe("Key points from the slide that were mentioned"),
  missedPoints: z.array(z.string()).describe("Important slide points not yet covered"),
  offTopicSegments: z.array(z.string()).describe("Parts of transcript that seem off-topic"),
  focusScore: z.number().min(0).max(100).describe("Overall focus score (0-100)"),
  recommendations: z.array(z.string()).max(3).describe("Specific recommendations to improve focus"),
})

export async function POST(request: NextRequest) {
  try {
    const { transcript, slideContent } = await request.json()

    if (!transcript || transcript.length < 20 || !slideContent) {
      return NextResponse.json({
        semanticAlignment: 0,
        keyPointsCovered: [],
        missedPoints: slideContent?.bullets || [],
        offTopicSegments: [],
        focusScore: 0,
        recommendations: ["Start speaking about the current slide content"],
      })
    }

    const { object } = await generateObject({
      model: "openai/gpt-5-mini",
      schema: focusAnalysisSchema,
      prompt: `You are a presentation focus analyzer. Analyze how well the speaker's content aligns with their slide.

SLIDE CONTENT:
Title: ${slideContent.title || "No title"}
Content: ${slideContent.content || "No content"}
Key Points: ${slideContent.bullets?.join(", ") || "No key points"}

SPEAKER TRANSCRIPT:
"${transcript}"

ANALYSIS TASKS:
1. Calculate semantic alignment (0-100) between transcript and slide content
2. Identify which key points from the slide were covered in the transcript
3. List important slide points that haven't been mentioned yet
4. Identify any off-topic segments in the transcript
5. Calculate an overall focus score (0-100)
6. Provide 1-3 specific recommendations to improve content focus

SCORING GUIDELINES:
- 90-100: Perfect alignment, all key points covered clearly
- 70-89: Good alignment, most key points covered
- 50-69: Moderate alignment, some key points covered
- 30-49: Poor alignment, few key points covered
- 0-29: Very poor alignment, mostly off-topic

Be precise and actionable in your analysis.`,
      maxOutputTokens: 800,
    })

    return NextResponse.json(object)
  } catch (error) {
    console.error("[v0] Focus analysis error:", error)

    // Fallback analysis
    const slideKeywords = slideContent?.bullets?.join(" ").toLowerCase() || ""
    const transcriptLower = transcript.toLowerCase()

    let basicAlignment = 0
    if (slideKeywords) {
      const keywords = slideKeywords.split(" ").filter((word) => word.length > 3)
      const matches = keywords.filter((keyword) => transcriptLower.includes(keyword))
      basicAlignment = Math.round((matches.length / keywords.length) * 100)
    }

    return NextResponse.json({
      semanticAlignment: basicAlignment,
      keyPointsCovered: [],
      missedPoints: slideContent?.bullets || [],
      offTopicSegments: [],
      focusScore: basicAlignment,
      recommendations: ["Focus more on the current slide's key points"],
    })
  }
}
