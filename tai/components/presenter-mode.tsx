"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Mic, MicOff, Square, ChevronLeft, ChevronRight, Clock, Target, Brain } from "lucide-react"
import { SpeechRecognition } from "@/components/speech-recognition"
import { PresenterOverlay } from "@/components/presenter-overlay"
import { FocusAgent } from "@/components/focus-agent"
import { PacingAgent } from "@/components/pacing-agent"
import { ADKAgentHost } from "@/components/adk-agent-host"

interface PresenterModeProps {
  slides: any[]
  onStop: () => void
}

interface FocusAnalysis {
  semanticAlignment: number
  keyPointsCovered: string[]
  missedPoints: string[]
  offTopicSegments: string[]
  focusScore: number
  recommendations: string[]
}

interface PacingAnalysis {
  currentWpm: number
  targetWpm: number
  wmpTrend: "increasing" | "decreasing" | "stable"
  slideTimeElapsed: number
  targetSlideTime: number
  timeWarning: string | null
  pacingWarning: string | null
  recommendations: string[]
  pacingScore: number
}

interface AgentResponse {
  type: "suggestion" | "warning" | "insight"
  message: string
  priority: "low" | "medium" | "high"
  source: "focus" | "pacing" | "content" | "general"
}

export function PresenterMode({ slides, onStop }: PresenterModeProps) {
  const [currentSlide, setCurrentSlide] = useState(0)
  const [isRecording, setIsRecording] = useState(false)
  const [transcript, setTranscript] = useState("")
  const [wpm, setWpm] = useState(0)
  const [slideStartTime, setSlideStartTime] = useState(Date.now())
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [warnings, setWarnings] = useState<string[]>([])
  const [focusAnalysis, setFocusAnalysis] = useState<FocusAnalysis | null>(null)
  const [pacingAnalysis, setPacingAnalysis] = useState<PacingAnalysis | null>(null)
  const [targetWpm, setTargetWpm] = useState(150)
  const [targetSlideDuration, setTargetSlideDuration] = useState(60)
  const [agentInsights, setAgentInsights] = useState<AgentResponse[]>([])
  const [isADKActive, setIsADKActive] = useState(true)

  const nextSlide = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1)
      setSlideStartTime(Date.now())
      setTranscript("")
      setAgentInsights([])
    }
  }

  const prevSlide = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1)
      setSlideStartTime(Date.now())
      setTranscript("")
      setAgentInsights([])
    }
  }

  const toggleRecording = () => {
    setIsRecording(!isRecording)
    if (!isRecording) {
      setSlideStartTime(Date.now())
    }
  }

  const handleTranscriptUpdate = (newTranscript: string, currentWpm: number) => {
    setTranscript(newTranscript)
    setWpm(currentWpm)
  }

  const handleSuggestions = (newSuggestions: string[]) => {
    setSuggestions(newSuggestions)
  }

  const handleWarnings = (newWarnings: string[]) => {
    setWarnings(newWarnings)
  }

  const handleFocusAnalysis = (analysis: FocusAnalysis) => {
    setFocusAnalysis(analysis)

    if (analysis.recommendations.length > 0) {
      setSuggestions((prev) => [...prev, ...analysis.recommendations])
    }

    if (analysis.focusScore < 60) {
      setWarnings((prev) => [...prev, "Content seems off-topic - refocus on slide material"])
    }

    if (analysis.missedPoints.length > 0) {
      setWarnings((prev) => [...prev, `Missing key points: ${analysis.missedPoints.slice(0, 2).join(", ")}`])
    }
  }

  const handlePacingAnalysis = (analysis: PacingAnalysis) => {
    setPacingAnalysis(analysis)

    if (analysis.pacingWarning) {
      setWarnings((prev) => {
        const filtered = prev.filter((w) => !w.includes("Speaking") && !w.includes("pace"))
        return [...filtered, analysis.pacingWarning!]
      })
    }

    if (analysis.timeWarning) {
      setWarnings((prev) => {
        const filtered = prev.filter((w) => !w.includes("time") && !w.includes("slide"))
        return [...filtered, analysis.timeWarning!]
      })
    }

    if (analysis.recommendations.length > 0) {
      setSuggestions((prev) => {
        const filtered = prev.filter((s) => !s.includes("pace") && !s.includes("slow") && !s.includes("fast"))
        return [...filtered, ...analysis.recommendations]
      })
    }
  }

  const handleAgentResponse = (response: AgentResponse) => {
    setAgentInsights((prev) => {
      const filtered = prev.filter((insight) => insight.source !== response.source)
      return [...filtered, response].slice(-5)
    })

    if (response.type === "warning" && response.priority === "high") {
      setWarnings((prev) => [...prev.slice(-2), response.message])
    } else if (response.type === "suggestion") {
      setSuggestions((prev) => [...prev.slice(-3), response.message])
    }
  }

  const slideProgress = Math.min(((Date.now() - slideStartTime) / (targetSlideDuration * 1000)) * 100, 100)

  return (
    <div className="min-h-screen bg-background flex">
      {/* Main presentation area */}
      <div className="flex-1 flex flex-col">
        {/* Top controls */}
        <div className="bg-card border-b p-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" onClick={onStop}>
              <Square className="h-4 w-4 mr-2" />
              Stop
            </Button>

            <div className="flex items-center gap-2">
              <Button variant={isRecording ? "destructive" : "default"} size="sm" onClick={toggleRecording}>
                {isRecording ? <MicOff className="h-4 w-4 mr-2" /> : <Mic className="h-4 w-4 mr-2" />}
                {isRecording ? "Stop Recording" : "Start Recording"}
              </Button>

              {isRecording && (
                <Badge variant="destructive" className="animate-pulse">
                  Recording
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant={isADKActive ? "default" : "outline"}
                size="sm"
                onClick={() => setIsADKActive(!isADKActive)}
              >
                <Brain className="h-4 w-4 mr-2" />
                AI Agents
              </Button>

              {isADKActive && agentInsights.length > 0 && (
                <Badge variant="secondary">{agentInsights.length} insights</Badge>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4" />
              <span>{Math.floor((Date.now() - slideStartTime) / 1000)}s</span>
              <span className="text-muted-foreground">/ {targetSlideDuration}s</span>
            </div>

            <div className="flex items-center gap-2 text-sm">
              <Target className="h-4 w-4" />
              <span>{wpm} WPM</span>
              <span className="text-muted-foreground">/ {targetWpm}</span>
            </div>

            {focusAnalysis && (
              <div className="flex items-center gap-2 text-sm">
                <div className="w-2 h-2 rounded-full bg-primary" />
                <span>Focus: {focusAnalysis.focusScore}%</span>
              </div>
            )}

            {pacingAnalysis && (
              <div className="flex items-center gap-2 text-sm">
                <div
                  className={`w-2 h-2 rounded-full ${
                    pacingAnalysis.pacingScore >= 80
                      ? "bg-green-500"
                      : pacingAnalysis.pacingScore >= 60
                        ? "bg-yellow-500"
                        : "bg-red-500"
                  }`}
                />
                <span>Pace: {pacingAnalysis.pacingScore}%</span>
              </div>
            )}

            <span className="text-sm text-muted-foreground">
              {currentSlide + 1} / {slides.length}
            </span>
          </div>
        </div>

        {/* Slide display */}
        <div className="flex-1 flex items-center justify-center p-8">
          <Card className="w-full max-w-4xl aspect-video">
            <CardContent className="p-8 h-full flex items-center justify-center">
              <div className="text-center space-y-4">
                <h1 className="text-4xl font-bold">{slides[currentSlide]?.title || `Slide ${currentSlide + 1}`}</h1>
                <p className="text-xl text-muted-foreground">
                  {slides[currentSlide]?.content || "Presentation Content"}
                </p>

                {slides[currentSlide]?.bullets && (
                  <div className="text-left max-w-2xl mx-auto space-y-2">
                    {slides[currentSlide].bullets.map((bullet: string, index: number) => (
                      <div key={index} className="flex items-start gap-2 text-sm">
                        <div className="w-1 h-1 rounded-full bg-primary mt-2 flex-shrink-0" />
                        <span>{bullet}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Bottom controls */}
        <div className="bg-card border-t p-4 flex items-center justify-between">
          <Button variant="outline" onClick={prevSlide} disabled={currentSlide === 0}>
            <ChevronLeft className="h-4 w-4 mr-2" />
            Previous
          </Button>

          <div className="flex-1 mx-8">
            <Progress value={slideProgress} className="w-full" />
            <p className="text-xs text-center text-muted-foreground mt-1">
              Slide Progress ({Math.floor((Date.now() - slideStartTime) / 1000)}s / {targetSlideDuration}s)
            </p>
          </div>

          <Button variant="outline" onClick={nextSlide} disabled={currentSlide === slides.length - 1}>
            Next
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>

      {/* Presenter overlay - only visible to presenter */}
      <PresenterOverlay
        suggestions={suggestions}
        warnings={warnings}
        transcript={transcript}
        wpm={wpm}
        currentSlide={currentSlide}
        slideContent={slides[currentSlide]}
        focusAnalysis={focusAnalysis}
        pacingAnalysis={pacingAnalysis}
        agentInsights={agentInsights}
      />

      {/* Speech recognition component */}
      {isRecording && (
        <SpeechRecognition
          onTranscriptUpdate={handleTranscriptUpdate}
          onSuggestions={handleSuggestions}
          onWarnings={handleWarnings}
          slideContent={slides[currentSlide]}
        />
      )}

      {/* Focus Agent component */}
      {isRecording && (
        <FocusAgent transcript={transcript} slideContent={slides[currentSlide]} onFocusAnalysis={handleFocusAnalysis} />
      )}

      {/* Pacing Agent component */}
      {isRecording && (
        <PacingAgent
          transcript={transcript}
          wpm={wpm}
          slideStartTime={slideStartTime}
          targetWpm={targetWpm}
          targetSlideDuration={targetSlideDuration}
          onPacingAnalysis={handlePacingAnalysis}
        />
      )}

      {/* ADK Agent Host */}
      {isRecording && isADKActive && (
        <ADKAgentHost
          transcript={transcript}
          slideContent={slides[currentSlide]}
          wpm={wpm}
          focusAnalysis={focusAnalysis}
          pacingAnalysis={pacingAnalysis}
          onAgentResponse={handleAgentResponse}
        />
      )}
    </div>
  )
}
