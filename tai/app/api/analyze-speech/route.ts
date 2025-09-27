import { type NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"

export async function POST(request: NextRequest) {
  try {
    const { transcript, slideContent, wpm, wordCount, fillerCount } = await request.json()

    if (!transcript || transcript.length < 10) {
      return NextResponse.json({ suggestions: [], warnings: [] })
    }

    const { text } = await generateText({
      model: "openai/gpt-5-mini",
      prompt: `You are an expert presentation coach analyzing a speaker's real-time performance.

CURRENT SLIDE CONTEXT:
Title: ${slideContent?.title || "Unknown"}
Content: ${slideContent?.content || "No content"}
Key points to cover: ${slideContent?.bullets?.join(", ") || "No key points"}

SPEAKER PERFORMANCE DATA:
Transcript: "${transcript}"
Speaking rate: ${wpm} WPM
Total words spoken: ${wordCount}
Filler words detected: ${fillerCount}

ANALYSIS REQUIREMENTS:
1. Check if speaker is covering the slide's key points
2. Assess content clarity and organization
3. Identify missing important information from the slide
4. Evaluate engagement and explanation quality
5. Suggest improvements for better audience understanding

Provide actionable feedback in JSON format:
{
  "suggestions": ["specific actionable suggestion 1", "specific actionable suggestion 2"],
  "warnings": ["specific issue warning 1", "specific issue warning 2"]
}

GUIDELINES:
- Keep each item under 60 characters
- Focus on content alignment with slide material
- Prioritize most important feedback (max 3 suggestions, 2 warnings)
- Be specific and actionable
- Consider the presentation context and flow`,
      maxOutputTokens: 600,
    })

    try {
      const analysis = JSON.parse(text)

      // Validate and clean the response
      const cleanedAnalysis = {
        suggestions: (analysis.suggestions || []).slice(0, 3).filter((s: string) => s && s.length > 0),
        warnings: (analysis.warnings || []).slice(0, 2).filter((w: string) => w && w.length > 0),
      }

      return NextResponse.json(cleanedAnalysis)
    } catch (parseError) {
      console.error("[v0] JSON parsing failed:", parseError)
      // Fallback analysis based on basic metrics
      const suggestions = []
      const warnings = []

      if (slideContent?.bullets && slideContent.bullets.length > 0) {
        const slideKeywords = slideContent.bullets.join(" ").toLowerCase()
        const transcriptLower = transcript.toLowerCase()
        const coverage = slideContent.bullets.filter((bullet: string) =>
          transcriptLower.includes(bullet.toLowerCase().split(" ")[0]),
        ).length

        if (coverage < slideContent.bullets.length / 2) {
          suggestions.push("Cover more key points from the current slide")
        }
      }

      if (wpm > 0 && wordCount > 50 && transcript.split(".").length < 3) {
        suggestions.push("Break content into shorter, clearer sentences")
      }

      return NextResponse.json({ suggestions, warnings })
    }
  } catch (error) {
    console.error("[v0] Speech analysis error:", error)
    return NextResponse.json({
      suggestions: ["Continue explaining the current slide content"],
      warnings: [],
    })
  }
}
