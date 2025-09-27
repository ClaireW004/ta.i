"use client"

import { useEffect, useRef, useState } from "react"

interface ADKAgentHostProps {
  transcript: string
  slideContent: any
  wpm: number
  focusAnalysis: any
  pacingAnalysis: any
  onAgentResponse: (response: AgentResponse) => void
}

interface AgentResponse {
  type: "suggestion" | "warning" | "insight"
  message: string
  priority: "low" | "medium" | "high"
  source: "focus" | "pacing" | "content" | "general"
}

interface AgentTask {
  id: string
  type: "analyze_content" | "check_pacing" | "evaluate_focus" | "generate_suggestions"
  payload: any
  timestamp: number
}

export function ADKAgentHost({
  transcript,
  slideContent,
  wpm,
  focusAnalysis,
  pacingAnalysis,
  onAgentResponse,
}: ADKAgentHostProps) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [taskQueue, setTaskQueue] = useState<AgentTask[]>([])
  const workerRef = useRef<Worker | null>(null)
  const processingTimeoutRef = useRef<NodeJS.Timeout>()

  useEffect(() => {
    initializeADKHost()

    return () => {
      if (workerRef.current) {
        workerRef.current.terminate()
      }
      if (processingTimeoutRef.current) {
        clearTimeout(processingTimeoutRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (transcript.length > 50) {
      queueAgentTask({
        id: `content_${Date.now()}`,
        type: "analyze_content",
        payload: { transcript, slideContent, wpm },
        timestamp: Date.now(),
      })
    }

    if (focusAnalysis) {
      queueAgentTask({
        id: `focus_${Date.now()}`,
        type: "evaluate_focus",
        payload: focusAnalysis,
        timestamp: Date.now(),
      })
    }

    if (pacingAnalysis) {
      queueAgentTask({
        id: `pacing_${Date.now()}`,
        type: "check_pacing",
        payload: pacingAnalysis,
        timestamp: Date.now(),
      })
    }
  }, [transcript, slideContent, wpm, focusAnalysis, pacingAnalysis])

  const initializeADKHost = () => {
    console.log("[v0] Initializing ADK Agent Host...")

    // In a real implementation, this would initialize the Google ADK
    // For MVP, we simulate with a processing system
    setIsProcessing(false)
  }

  const queueAgentTask = (task: AgentTask) => {
    setTaskQueue((prev) => {
      // Remove duplicate tasks of the same type
      const filtered = prev.filter((t) => t.type !== task.type)
      return [...filtered, task]
    })

    // Process tasks with debouncing
    if (processingTimeoutRef.current) {
      clearTimeout(processingTimeoutRef.current)
    }

    processingTimeoutRef.current = setTimeout(() => {
      processTaskQueue()
    }, 1000)
  }

  const processTaskQueue = async () => {
    if (taskQueue.length === 0 || isProcessing) return

    setIsProcessing(true)
    console.log(`[v0] Processing ${taskQueue.length} ADK agent tasks...`)

    try {
      const response = await fetch("/api/adk-agent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tasks: taskQueue,
          context: {
            currentSlide: slideContent,
            sessionData: {
              totalWords: transcript.split(/\s+/).length,
              avgWpm: wpm,
              focusScore: focusAnalysis?.focusScore || 0,
              pacingScore: pacingAnalysis?.pacingScore || 0,
            },
          },
        }),
      })

      if (response.ok) {
        const results = await response.json()

        // Process agent responses
        results.responses?.forEach((agentResponse: AgentResponse) => {
          onAgentResponse(agentResponse)
        })
      }
    } catch (error) {
      console.error("[v0] ADK agent processing failed:", error)
    } finally {
      setIsProcessing(false)
      setTaskQueue([]) // Clear processed tasks
    }
  }

  return null // This is a headless component
}
