"use client"

import { useEffect, useRef, useState } from "react"

interface FocusAgentProps {
  transcript: string
  slideContent: any
  onFocusAnalysis: (analysis: FocusAnalysis) => void
}

interface FocusAnalysis {
  semanticAlignment: number // 0-100 score
  keyPointsCovered: string[]
  missedPoints: string[]
  offTopicSegments: string[]
  focusScore: number // 0-100 overall focus score
  recommendations: string[]
}

export function FocusAgent({ transcript, slideContent, onFocusAnalysis }: FocusAgentProps) {
  const [lastAnalysis, setLastAnalysis] = useState<FocusAnalysis | null>(null)
  const analysisTimeoutRef = useRef<NodeJS.Timeout>()

  useEffect(() => {
    if (!transcript || transcript.length < 50 || !slideContent) {
      return
    }

    // Debounce analysis to avoid too frequent API calls
    if (analysisTimeoutRef.current) {
      clearTimeout(analysisTimeoutRef.current)
    }

    analysisTimeoutRef.current = setTimeout(async () => {
      try {
        const response = await fetch("/api/focus-analysis", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            transcript,
            slideContent,
          }),
        })

        if (response.ok) {
          const analysis: FocusAnalysis = await response.json()
          setLastAnalysis(analysis)
          onFocusAnalysis(analysis)
        }
      } catch (error) {
        console.error("[v0] Focus analysis failed:", error)
      }
    }, 3000) // Analyze every 3 seconds

    return () => {
      if (analysisTimeoutRef.current) {
        clearTimeout(analysisTimeoutRef.current)
      }
    }
  }, [transcript, slideContent, onFocusAnalysis])

  return null // This is a headless component
}
