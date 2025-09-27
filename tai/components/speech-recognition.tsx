"use client"

import { useEffect, useRef, useState, useCallback } from "react"

interface SpeechRecognitionProps {
  onTranscriptUpdate: (transcript: string, wpm: number) => void
  onSuggestions: (suggestions: string[]) => void
  onWarnings: (warnings: string[]) => void
  slideContent: any
}

export function SpeechRecognition({
  onTranscriptUpdate,
  onSuggestions,
  onWarnings,
  slideContent,
}: SpeechRecognitionProps) {
  const [recognition, setRecognition] = useState<any>(null)
  const [transcript, setTranscript] = useState("")
  const [wordCount, setWordCount] = useState(0)
  const [startTime, setStartTime] = useState(Date.now())
  const [isListening, setIsListening] = useState(false)
  const intervalRef = useRef<NodeJS.Timeout>()
  const analysisTimeoutRef = useRef<NodeJS.Timeout>()

  const analyzeTranscript = useCallback(
    async (transcript: string, wpm: number, slideContent: any) => {
      if (analysisTimeoutRef.current) {
        clearTimeout(analysisTimeoutRef.current)
      }

      analysisTimeoutRef.current = setTimeout(async () => {
        const warnings: string[] = []
        const suggestions: string[] = []

        // Enhanced pacing analysis
        if (wpm > 200) {
          warnings.push("Speaking very fast - audience may struggle to follow")
        } else if (wpm > 180) {
          warnings.push("Speaking too fast - slow down for better comprehension")
        } else if (wpm < 100 && transcript.length > 50) {
          warnings.push("Speaking too slowly - increase your pace")
        } else if (wpm < 80 && transcript.length > 100) {
          warnings.push("Very slow pace - audience may lose attention")
        }

        // Enhanced filler word detection with severity levels
        const fillerWords = ["um", "uh", "like", "you know", "so", "basically", "actually", "literally"]
        const fillerCount = fillerWords.reduce((count, word) => {
          const regex = new RegExp(`\\b${word}\\b`, "gi")
          return count + (transcript.match(regex) || []).length
        }, 0)

        const wordCount = transcript.trim().split(/\s+/).length
        const fillerRatio = wordCount > 0 ? fillerCount / wordCount : 0

        if (fillerRatio > 0.1) {
          warnings.push("Too many filler words - practice smoother transitions")
        } else if (fillerRatio > 0.05) {
          suggestions.push("Reduce filler words for clearer communication")
        }

        // Repetition detection
        const words = transcript.toLowerCase().split(/\s+/)
        const wordFreq: { [key: string]: number } = {}
        words.forEach((word) => {
          if (word.length > 3) {
            wordFreq[word] = (wordFreq[word] || 0) + 1
          }
        })

        const repeatedWords = Object.entries(wordFreq).filter(([word, count]) => count > 3)
        if (repeatedWords.length > 0) {
          suggestions.push("Vary your vocabulary - avoid repeating key words")
        }

        // Call AI agent for semantic analysis
        try {
          const response = await fetch("/api/analyze-speech", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              transcript,
              slideContent,
              wpm,
              wordCount,
              fillerCount,
            }),
          })

          if (response.ok) {
            const analysis = await response.json()
            if (analysis.suggestions) {
              suggestions.push(...analysis.suggestions)
            }
            if (analysis.warnings) {
              warnings.push(...analysis.warnings)
            }
          }
        } catch (error) {
          console.error("Failed to analyze speech:", error)
        }

        onWarnings(warnings)
        onSuggestions(suggestions)
      }, 2000) // Debounce analysis by 2 seconds
    },
    [onWarnings, onSuggestions],
  )

  useEffect(() => {
    if (typeof window !== "undefined" && "webkitSpeechRecognition" in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition
      const recognitionInstance = new SpeechRecognition()

      recognitionInstance.continuous = true
      recognitionInstance.interimResults = true
      recognitionInstance.lang = "en-US"
      recognitionInstance.maxAlternatives = 1

      let finalTranscript = ""

      recognitionInstance.onstart = () => {
        setIsListening(true)
        console.log("[v0] Speech recognition started")
      }

      recognitionInstance.onend = () => {
        setIsListening(false)
        console.log("[v0] Speech recognition ended")

        // Auto-restart if still supposed to be listening
        if (recognition && !recognition.aborted) {
          setTimeout(() => {
            try {
              recognitionInstance.start()
            } catch (error) {
              console.error("[v0] Failed to restart recognition:", error)
            }
          }, 100)
        }
      }

      recognitionInstance.onresult = (event: any) => {
        let interimTranscript = ""

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript
          if (event.results[i].isFinal) {
            finalTranscript += transcript + " "
          } else {
            interimTranscript += transcript
          }
        }

        const fullTranscript = finalTranscript + interimTranscript
        setTranscript(fullTranscript)

        const words = fullTranscript
          .trim()
          .split(/\s+/)
          .filter((word) => word.length > 0)
        setWordCount(words.length)

        // Calculate WPM with better accuracy
        const timeElapsed = (Date.now() - startTime) / 60000 // minutes
        const currentWpm = timeElapsed > 0.1 ? Math.round(words.length / timeElapsed) : 0

        onTranscriptUpdate(fullTranscript, currentWpm)

        // Analyze for suggestions and warnings
        if (fullTranscript.length > 20) {
          analyzeTranscript(fullTranscript, currentWpm, slideContent)
        }
      }

      recognitionInstance.onerror = (event: any) => {
        console.error("[v0] Speech recognition error:", event.error)
        setIsListening(false)

        // Handle specific errors
        if (event.error === "not-allowed") {
          onWarnings(["Microphone access denied - please allow microphone permissions"])
        } else if (event.error === "no-speech") {
          // This is normal, just restart
          setTimeout(() => {
            try {
              recognitionInstance.start()
            } catch (error) {
              console.error("[v0] Failed to restart after no-speech:", error)
            }
          }, 100)
        }
      }

      setRecognition(recognitionInstance)
      recognitionInstance.start()
      setStartTime(Date.now())
    } else {
      // Fallback for browsers without Web Speech API
      onWarnings(["Speech recognition not supported in this browser"])
    }

    return () => {
      if (recognition) {
        recognition.aborted = true
        recognition.stop()
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
      if (analysisTimeoutRef.current) {
        clearTimeout(analysisTimeoutRef.current)
      }
    }
  }, [])

  return null // This component doesn't render anything visible
}
