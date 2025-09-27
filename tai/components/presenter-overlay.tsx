"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Progress } from "@/components/ui/progress"
import {
  AlertTriangle,
  Lightbulb,
  MessageSquare,
  Activity,
  Clock,
  Target,
  CheckCircle,
  XCircle,
  TrendingUp,
  TrendingDown,
  Minus,
  Brain,
  Zap,
} from "lucide-react"

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

interface PresenterOverlayProps {
  suggestions: string[]
  warnings: string[]
  transcript: string
  wpm: number
  currentSlide: number
  slideContent: any
  focusAnalysis?: FocusAnalysis | null
  pacingAnalysis?: PacingAnalysis | null
  agentInsights?: AgentResponse[]
}

export function PresenterOverlay({
  suggestions,
  warnings,
  transcript,
  wpm,
  currentSlide,
  slideContent,
  focusAnalysis,
  pacingAnalysis,
  agentInsights = [],
}: PresenterOverlayProps) {
  const getWmpStatus = (wpm: number) => {
    if (wpm > 200) return { variant: "destructive" as const, label: "Too Fast" }
    if (wpm > 180) return { variant: "destructive" as const, label: "Fast" }
    if (wpm >= 120 && wpm <= 180) return { variant: "default" as const, label: "Good" }
    if (wpm >= 100) return { variant: "secondary" as const, label: "Slow" }
    if (wpm > 0) return { variant: "secondary" as const, label: "Too Slow" }
    return { variant: "outline" as const, label: "Silent" }
  }

  const wmpStatus = getWmpStatus(wpm)

  const words = transcript
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0)
  const sentences = transcript.split(/[.!?]+/).filter((s) => s.trim().length > 0)
  const avgWordsPerSentence = sentences.length > 0 ? Math.round(words.length / sentences.length) : 0

  const getFocusStatus = (score: number) => {
    if (score >= 80) return { variant: "default" as const, label: "Excellent" }
    if (score >= 60) return { variant: "secondary" as const, label: "Good" }
    if (score >= 40) return { variant: "destructive" as const, label: "Poor" }
    return { variant: "destructive" as const, label: "Off-topic" }
  }

  const getPacingStatus = (score: number) => {
    if (score >= 80) return { variant: "default" as const, label: "Excellent" }
    if (score >= 60) return { variant: "secondary" as const, label: "Good" }
    if (score >= 40) return { variant: "destructive" as const, label: "Poor" }
    return { variant: "destructive" as const, label: "Critical" }
  }

  const getTrendIcon = (trend: "increasing" | "decreasing" | "stable") => {
    switch (trend) {
      case "increasing":
        return <TrendingUp className="h-3 w-3 text-green-500" />
      case "decreasing":
        return <TrendingDown className="h-3 w-3 text-red-500" />
      default:
        return <Minus className="h-3 w-3 text-muted-foreground" />
    }
  }

  const getInsightIcon = (source: string) => {
    switch (source) {
      case "focus":
        return <Target className="h-3 w-3" />
      case "pacing":
        return <Clock className="h-3 w-3" />
      case "content":
        return <MessageSquare className="h-3 w-3" />
      default:
        return <Brain className="h-3 w-3" />
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "text-destructive"
      case "medium":
        return "text-primary"
      default:
        return "text-muted-foreground"
    }
  }

  return (
    <div className="w-80 bg-card border-l flex flex-col">
      <div className="p-4 border-b">
        <h2 className="font-semibold text-sm">Presenter Assistant</h2>
        <p className="text-xs text-muted-foreground">Private feedback panel</p>
      </div>

      <div className="p-4 border-b space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm flex items-center gap-1">
            <Activity className="h-3 w-3" />
            Speaking Rate
          </span>
          <div className="flex items-center gap-1">
            {pacingAnalysis && getTrendIcon(pacingAnalysis.wmpTrend)}
            <Badge variant={wmpStatus.variant}>
              {wpm} WPM ({wmpStatus.label})
            </Badge>
          </div>
        </div>

        {focusAnalysis && (
          <div className="flex items-center justify-between">
            <span className="text-sm flex items-center gap-1">
              <Target className="h-3 w-3" />
              Content Focus
            </span>
            <Badge variant={getFocusStatus(focusAnalysis.focusScore).variant}>
              {focusAnalysis.focusScore}% ({getFocusStatus(focusAnalysis.focusScore).label})
            </Badge>
          </div>
        )}

        {pacingAnalysis && (
          <div className="flex items-center justify-between">
            <span className="text-sm flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Pacing Score
            </span>
            <Badge variant={getPacingStatus(pacingAnalysis.pacingScore).variant}>
              {pacingAnalysis.pacingScore}% ({getPacingStatus(pacingAnalysis.pacingScore).label})
            </Badge>
          </div>
        )}

        <div className="flex items-center justify-between">
          <span className="text-sm flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Current Slide
          </span>
          <Badge variant="outline">{currentSlide + 1}</Badge>
        </div>

        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Optimal: 120-180 WPM</span>
            <span>{Math.min(Math.max((wpm / 180) * 100, 0), 100).toFixed(0)}%</span>
          </div>
          <Progress value={Math.min(Math.max((wpm / 180) * 100, 0), 100)} className="h-2" />
        </div>

        {focusAnalysis && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Content Alignment</span>
              <span>{focusAnalysis.focusScore}%</span>
            </div>
            <Progress value={focusAnalysis.focusScore} className="h-2" />
          </div>
        )}

        {pacingAnalysis && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Slide Timing</span>
              <span>
                {Math.floor(pacingAnalysis.slideTimeElapsed)}s / {pacingAnalysis.targetSlideTime}s
              </span>
            </div>
            <Progress
              value={Math.min((pacingAnalysis.slideTimeElapsed / pacingAnalysis.targetSlideTime) * 100, 100)}
              className="h-2"
            />
          </div>
        )}

        {words.length > 0 && (
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="text-center p-2 bg-muted rounded">
              <div className="font-medium">{words.length}</div>
              <div className="text-muted-foreground">Words</div>
            </div>
            <div className="text-center p-2 bg-muted rounded">
              <div className="font-medium">{avgWordsPerSentence}</div>
              <div className="text-muted-foreground">Avg/Sentence</div>
            </div>
          </div>
        )}
      </div>

      {agentInsights.length > 0 && (
        <Card className="m-4 mb-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              AI Insights ({agentInsights.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ScrollArea className="h-20">
              <div className="space-y-1">
                {agentInsights.map((insight, index) => (
                  <div key={index} className="flex items-start gap-2">
                    {getInsightIcon(insight.source)}
                    <p className={`text-xs leading-relaxed ${getPriorityColor(insight.priority)}`}>{insight.message}</p>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {focusAnalysis && slideContent?.bullets && (
        <Card className="m-4 mb-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-primary" />
              Key Points Coverage
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              {slideContent.bullets.map((bullet: string, index: number) => {
                const isCovered = focusAnalysis.keyPointsCovered.some((covered) =>
                  covered.toLowerCase().includes(bullet.toLowerCase().split(" ")[0]),
                )
                return (
                  <div key={index} className="flex items-center gap-2 text-xs">
                    {isCovered ? (
                      <CheckCircle className="h-3 w-3 text-green-500" />
                    ) : (
                      <XCircle className="h-3 w-3 text-muted-foreground" />
                    )}
                    <span className={isCovered ? "text-foreground" : "text-muted-foreground"}>{bullet}</span>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {warnings.length > 0 && (
        <Card className="m-4 mb-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              Warnings ({warnings.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ScrollArea className="h-20">
              <div className="space-y-1">
                {warnings.map((warning, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <div className="w-1 h-1 rounded-full bg-destructive mt-2 flex-shrink-0" />
                    <p className="text-xs text-destructive leading-relaxed">{warning}</p>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {suggestions.length > 0 && (
        <Card className="m-4 mb-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-primary" />
              Suggestions ({suggestions.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ScrollArea className="h-24">
              <div className="space-y-1">
                {suggestions.map((suggestion, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <div className="w-1 h-1 rounded-full bg-primary mt-2 flex-shrink-0" />
                    <p className="text-xs text-muted-foreground leading-relaxed">{suggestion}</p>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      <Card className="m-4 flex-1">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Live Transcript
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 flex-1">
          <ScrollArea className="h-full">
            <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">
              {transcript || "Start speaking to see live transcript..."}
            </p>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}
