"use client"

import { useEffect, useRef, useState } from "react"

interface PacingAgentProps {
  transcript: string
  wpm: number
  slideStartTime: number
  targetWpm: number
  targetSlideDuration: number
  onPacingAnalysis: (analysis: PacingAnalysis) => void
}

interface PacingAnalysis {
  currentWpm: number
  targetWpm: number
  wpmTrend: "increasing" | "decreasing" | "stable"
  slideTimeElapsed: number
  targetSlideTime: number
  timeWarning: string | null
  pacingWarning: string | null
  recommendations: string[]
  pacingScore: number // 0-100
}

export function PacingAgent({
  transcript,
  wpm,
  slideStartTime,
  targetWpm = 150,
  targetSlideDuration = 60,
  onPacingAnalysis,
}: PacingAgentProps) {
  const [wpmHistory, setWpmHistory] = useState<number[]>([])
  const [lastAnalysis, setLastAnalysis] = useState<PacingAnalysis | null>(null)
  const analysisIntervalRef = useRef<NodeJS.Timeout>()

  useEffect(() => {
    // Track WPM history for trend analysis
    if (wpm > 0) {
      setWpmHistory((prev) => [...prev.slice(-10), wpm]) // Keep last 10 readings
    }

    // Perform pacing analysis every 2 seconds
    if (analysisIntervalRef.current) {
      clearInterval(analysisIntervalRef.current)
    }

    analysisIntervalRef.current = setInterval(() => {
      const timeElapsed = (Date.now() - slideStartTime) / 1000 // seconds
      const analysis = analyzePacing(wpm, wpmHistory, timeElapsed, targetWpm, targetSlideDuration, transcript)

      setLastAnalysis(analysis)
      onPacingAnalysis(analysis)
    }, 2000)

    return () => {
      if (analysisIntervalRef.current) {
        clearInterval(analysisIntervalRef.current)
      }
    }
  }, [wpm, wpmHistory, slideStartTime, targetWpm, targetSlideDuration, transcript, onPacingAnalysis])

  const analyzePacing = (
    currentWpm: number,
    wpmHistory: number[],
    timeElapsed: number,
    targetWpm: number,
    targetSlideTime: number,
    transcript: string,
  ): PacingAnalysis => {
    const recommendations: string[] = []
    let pacingWarning: string | null = null
    let timeWarning: string | null = null

    // Analyze WPM trend
    let wpmTrend: "increasing" | "decreasing" | "stable" = "stable"
    if (wpmHistory.length >= 3) {
      const recent = wpmHistory.slice(-3)
      const avg1 = recent[0]
      const avg2 = (recent[1] + recent[2]) / 2

      if (avg2 > avg1 + 10) wpmTrend = "increasing"
      else if (avg2 < avg1 - 10) wpmTrend = "decreasing"
    }

    // WPM analysis
    const wpmDeviation = Math.abs(currentWpm - targetWpm)
    let pacingScore = Math.max(0, 100 - (wpmDeviation / targetWpm) * 100)

    if (currentWpm > targetWpm + 50) {
      pacingWarning = "Speaking much too fast - audience cannot follow"
      recommendations.push("Slow down significantly and pause between points")
    } else if (currentWpm > targetWpm + 30) {
      pacingWarning = "Speaking too fast - slow down for better comprehension"
      recommendations.push("Take deeper breaths and pause after key points")
    } else if (currentWpm < targetWpm - 30 && transcript.length > 100) {
      pacingWarning = "Speaking too slowly - audience may lose attention"
      recommendations.push("Increase your pace and energy level")
    } else if (currentWpm < targetWpm - 50 && transcript.length > 100) {
      pacingWarning = "Speaking much too slowly - pick up the pace"
      recommendations.push("Speak with more confidence and energy")
    }

    // Time management analysis
    const timeProgress = timeElapsed / targetSlideTime
    const wordProgress = transcript.split(/\s+/).length / (targetWpm * (targetSlideTime / 60))

    if (timeElapsed > targetSlideTime * 1.5) {
      timeWarning = "Spending too much time on this slide"
      recommendations.push("Consider moving to the next slide")
      pacingScore *= 0.7 // Reduce score for time overrun
    } else if (timeElapsed > targetSlideTime * 1.2) {
      timeWarning = "Running over target time for this slide"
      recommendations.push("Wrap up key points and prepare to advance")
      pacingScore *= 0.85
    } else if (timeProgress > 0.8 && wordProgress < 0.5) {
      recommendations.push("Cover remaining key points more quickly")
    }

    // Trend-based recommendations
    if (wpmTrend === "increasing" && currentWpm > targetWpm) {
      recommendations.push("Your pace is accelerating - consciously slow down")
    } else if (wpmTrend === "decreasing" && currentWpm < targetWpm) {
      recommendations.push("Your pace is slowing - maintain energy and speed")
    }

    // Silence detection
    const words = transcript
      .trim()
      .split(/\s+/)
      .filter((w) => w.length > 0)
    if (timeElapsed > 10 && words.length < 10) {
      pacingWarning = "Very little content detected - start speaking"
      pacingScore = 0
    }

    return {
      currentWpm,
      targetWpm,
      wpmTrend,
      slideTimeElapsed: timeElapsed,
      targetSlideTime,
      timeWarning,
      pacingWarning,
      recommendations: recommendations.slice(0, 2), // Limit to 2 recommendations
      pacingScore: Math.round(pacingScore),
    }
  }

  return null // This is a headless component
}
