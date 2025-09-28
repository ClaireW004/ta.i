"use client"

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { useTotalSeconds } from "./time-context";
import { ChevronLeft, ChevronRight, Lightbulb, Clock, MessageCircle, TrendingUp, FileText, AlertCircle } from "lucide-react"
import { VoiceRecorder } from "@/components/voice-recorder"
import { send } from "process"

interface Slide {
  id: number
  slide_number: number
  title: string
  content: string
  speaker_notes?: string
  thumbnail_url?: string
  content_url?: string
}

interface Presentation {
  id: number
  presentation_id: string
  title: string
  slide_count: number
  source_url?: string
  source_type?: string
}

interface Suggestion {
  type: string
  title: string
  content: string
  priority: "low" | "medium" | "high"
}

interface PresentationViewerProps {
  presentationId: string
}

const getSuggestionIcon = (type: string) => {
  switch (type) {
    case "speaking_tip":
      return <MessageCircle className="w-4 h-4" />
    case "content_enhancement":
      return <TrendingUp className="w-4 h-4" />
    case "timing":
      return <Clock className="w-4 h-4" />
    case "data_presentation":
      return <TrendingUp className="w-4 h-4" />
    case "audience_engagement":
      return <MessageCircle className="w-4 h-4" />
    default:
      return <Lightbulb className="w-4 h-4" />
  }
}

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case "high":
      return "destructive"
    case "medium":
      return "default"
    case "low":
      return "secondary"
    default:
      return "default"
  }
}

// Utility function to generate Google Slides embed URL with proper slide sync
const getGoogleSlidesEmbedUrl = (sourceUrl: string, slideIndex: number) => {
  try {
    // Extract presentation ID from various Google Slides URL formats
    const match = sourceUrl.match(/\/presentation\/d\/([a-zA-Z0-9-_]+)/)
    if (!match) return null

    const presentationId = match[1]
    // Generate optimized embed URL for faster loading
    // Use slide index (0-based) with Google Slides embed format
    // Note: Due to cross-origin restrictions, we can only control the initial slide load
    // Navigation within the iframe cannot be detected or controlled from outside
    
    // Optimized parameters for faster loading
    return `https://docs.google.com/presentation/d/${presentationId}/embed?start=false&loop=false&delayms=0&slide=${slideIndex + 1}&rm=minimal&chrome=false`
  } catch (error) {
    console.error('Error generating embed URL:', error)
    return null
  }
}

// Utility to open presentation in presenter mode (full screen, separate window)
const openPresenterWindow = (sourceUrl: string, slideIndex: number) => {
  try {
    const match = sourceUrl.match(/\/presentation\/d\/([a-zA-Z0-9-_]+)/)
    if (!match) return null

    const presentationId = match[1]

    // Open Google Slides in presentation mode starting at the current slide
    const presenterUrl = `https://docs.google.com/presentation/d/${presentationId}/present?start=false&loop=false&delayms=3000&slide=${slideIndex}`
    
    const presenterWindow = window.open(
      presenterUrl,
      'presenter_window',
      'width=1920,height=1080,fullscreen=yes,toolbar=no,menubar=no,scrollbars=no,resizable=yes,location=no'
    )

    // Focus the presenter window
    if (presenterWindow) {
      presenterWindow.focus()
    }

    return presenterWindow
  } catch (error) {
    console.error('Error opening presenter window:', error)
    return null
  }
}

function formatTime(secs: number): string {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  return [h, m, s].map((n) => n.toString().padStart(2, "0")).join(":");
}

interface CountdownButtonProps {
  totalSeconds: number; // pass this in from slide_importer.tsx
}

export function CountdownButton({ totalSeconds }: CountdownButtonProps) {
  const [remaining, setRemaining] = useState(totalSeconds);

  useEffect(() => {
    setRemaining(totalSeconds); // reset if prop changes
    const interval = setInterval(() => {
      setRemaining((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [totalSeconds]);

  return (
    <Button
      variant="outline"
      size="sm"
      className="text-xs"
    >
      {formatTime(remaining)}
    </Button>
  );
}

export function PresentationViewer({ presentationId }: PresentationViewerProps) {
  const rawTotalSeconds = useTotalSeconds();
  const totalSeconds = Number(rawTotalSeconds) || 0;
  const [presentation, setPresentation] = useState<Presentation | null>(null)
  const [slides, setSlides] = useState<Slide[]>([])
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0)
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [loading, setLoading] = useState(true)
  const [suggestionsLoading, setSuggestionsLoading] = useState(false)
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'embed' | 'content'>('embed')
  const [presenterMode, setPresenterMode] = useState(false)
  const [presenterWindow, setPresenterWindow] = useState<Window | null>(null)
  const [slideLoading, setSlideLoading] = useState(false)
  const [response, setResponse] = useState("")
  const [transcript, setTranscript] = useState<string | null>(null)
  // Show a UI pacing reminder when per-slide duration has elapsed
  const [pacingReminderActive, setPacingReminderActive] = useState(false)
  // Auto-advance timer ref (holds the timeout id)
  const slideTimerRef = React.useRef<number | null>(null)
  const perSlideDuration = slides.length > 0 && totalSeconds > 0 ? Math.floor(totalSeconds / slides.length) : 0
  const [visitedSlides, setVisitedSlides] = useState<Set<number>>(new Set([0])) // Start with first slide visited -->

  // Load presentation data
  useEffect(() => {
    const loadPresentation = async () => {
      try {
        setError(null)
        const response = await fetch(`/api/presentations/${presentationId}`)

        if (!response.ok) {
          throw new Error(`Failed to load presentation: ${response.status}`)
        }

        const data = await response.json()
        setPresentation(data.presentation)
        setSlides(data.slides || [])

        // Auto-select best view mode based on available data
        if (data.presentation?.source_url?.includes('docs.google.com')) {
          setViewMode('embed')
        } else {
          setViewMode('content')
        }
      } catch (error) {
        console.error("Error loading presentation:", error)
        setError(error instanceof Error ? error.message : "Failed to load presentation")
      } finally {
        setLoading(false)
      }
    }

    loadPresentation()
  }, [presentationId])

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowRight' || event.key === ' ') {
      nextSlide();
    } else if (event.key === 'ArrowLeft') {
      prevSlide();
    }
  }

  // Load suggestions when slide changes
  useEffect(() => {
    if (slides.length > 0 && currentSlideIndex >= 0) {
      loadSuggestions()
    }
  }, [currentSlideIndex, slides])

  const loadSuggestions = async () => {
    const currentSlide = slides[currentSlideIndex + 1]
    if (!currentSlide) return

    setSuggestionsLoading(true)
    try {
      const response = await fetch("/api/presentations/suggestions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          presentationId,
          currentSlideIndex,
          slideContent: currentSlide.content || currentSlide.title,
          speakerNotes: currentSlide.speaker_notes,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setSuggestions(data.suggestions || [])
      }
      // Fetch agent suggestions for the newly selected slide
      sendQuery();
    } catch (error) {
      console.error("Error loading suggestions:", error)
    } finally {
      setSuggestionsLoading(false)
    }
  }

  const goToSlide = (index: number) => {
    // Clear any running per-slide timer when user navigates manually
    if (slideTimerRef.current) {
      window.clearTimeout(slideTimerRef.current)
      slideTimerRef.current = null
    }

    console.log(`🔄 goToSlide called with index: ${index}, current: ${currentSlideIndex}, slides.length: ${slides.length}`)
    if (index >= 0 && index < slides.length) {
      console.log(`✅ Navigating to slide ${index}`)
      setCurrentSlideIndex(index)

      console.log(`📝 setCurrentSlideIndex called with: ${index}`)
      
      // Track visited slides for instant navigation
      setVisitedSlides(prev => {
        const newVisited = new Set([...prev, index])
        console.log(`📊 Visited slides: [${Array.from(newVisited).sort().join(', ')}]`)
        return newVisited
      })
      
      // Update URL to persist slide position across page refreshes
      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href)
        url.searchParams.set('slide', (index + 1).toString()) // Convert 0-based to 1-based for URL
        window.history.replaceState({}, '', url.toString())
      }
      
      // Update presenter window if it's open and in presenter mode
      if (presenterWindow && !presenterWindow.closed && presentation?.source_url) {
        console.log('Updating presenter window to new slide', index)
        const newSlide = slides[index]
        const newPresenterUrl = `https://docs.google.com/presentation/d/${presentation.source_url.match(/\/presentation\/d\/([a-zA-Z0-9-_]+)/)?.[1]}/present?start=false&loop=false&delayms=0&slide=${index + 1}`
        try {
          presenterWindow.location.href = newPresenterUrl
        } catch (error) {
          console.log('Could not update presenter window URL, it may be on a different domain')
        }
      }

      // Reset loading state after a brief moment
      setTimeout(() => setSlideLoading(false), 1000)
    }
  }

  // Start an auto-advance timer for the current slide. This will move to the next slide
  // after `perSlideDuration` seconds. Timers are cleared on manual navigation.
  const startSlideTimer = () => {
    // Clear any existing timer first
    if (slideTimerRef.current) {
      window.clearTimeout(slideTimerRef.current)
      slideTimerRef.current = null
    }

    // Don't start timer if there is no configured duration or no slides or on last slide
    if (!perSlideDuration || slides.length === 0 || currentSlideIndex >= slides.length - 1) return

    console.log(`Starting per-slide timer: ${perSlideDuration}s for slide ${currentSlideIndex + 1}`)
    // When the per-slide timer expires, show a pacing reminder instead of auto-advancing.
    // The user can then manually advance; manual navigation clears the reminder.
    slideTimerRef.current = window.setTimeout(() => {
      console.log('Per-slide duration elapsed — showing pacing reminder')
      setPacingReminderActive(true)
    }, perSlideDuration * 1000) as unknown as number
  }

  const handleOpenPresenterWindow = () => {
    if (presentation?.source_url) {
      const window = openPresenterWindow(presentation.source_url, currentSlideIndex)
      if (window) {
        setPresenterWindow(window)
        // Check if window is closed periodically
        const checkWindow = setInterval(() => {
          if (window.closed) {
            setPresenterWindow(null)
            clearInterval(checkWindow)
          }
        }, 1000)
      }
    }
  }

  const nextSlide = () => goToSlide(currentSlideIndex + 1)
  const prevSlide = () => goToSlide(currentSlideIndex - 1)

  async function sendQuery() {
    // Safely read the current slide content at call time
    const slide = slides[currentSlideIndex]
    const parts = []
    if (slide?.title) {
      parts.push(slide.title)
    }
    if (slide?.content) {
      parts.push(slide.content)
    }
    const queryText = parts.join(" ")
    if (!queryText) {
      setResponse("")
      return
    }

    setResponse("")
    try {
      const res = await fetch("http://localhost:5000/query", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query: queryText }),
      })
      const data = await res.json()
      setResponse(data.response)
    } catch (error) {
      setResponse("Error communicating with AI backend.")
    }
  }

  async function sendSummaryQuery() {
    setSummaryLoading(true)

    try {
      // Concatenate content from all slides
      const slideContent = slides
        .map(slide => {
          const title = slide.title ? `\n\n# ${slide.title}\n` : ""
          const content = slide.content || ""
          const notes = slide.speaker_notes ? `\n**Speaker Notes:**\n${slide.speaker_notes}` : ""
          return `${title}${content}${notes}`
        })
        .join("\n\n---\n\n")

      // Combine slide content and transcript
      let fullText = slideContent;
      if (transcript) {
        fullText += `\n\n### Presentation Transcript\n\n${transcript}`;
      }

      if (!fullText.trim()) {
        alert("No content to summarize.")
        setSummaryLoading(false)
        return
      }

      const res = await fetch("http://localhost:5000/summarize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: fullText }),
      })

      if (!res.ok) {
        throw new Error(`Server responded with ${res.status}`)
      }

      const data = await res.json()
      
      const summaryContent = data.summary;
      if (summaryContent) {
        const blob = new Blob([summaryContent], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${presentation?.title || 'presentation'}_summary.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        alert("Summary could not be generated.");
      }

    } catch (error) {
      console.error("Error fetching summary:", error)
      alert("Error communicating with summary AI backend.")
    } finally {
      setSummaryLoading(false)
    }
  }

  // Keyboard shortcuts for presentation control
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      // Only handle shortcuts if we're not typing in an input
      if (event.target instanceof HTMLInputElement) return

      if (event.code === 'ArrowRight' || event.code === 'Space') {
        event.preventDefault()
        nextSlide()
      } else if (event.code === 'ArrowLeft') {
        event.preventDefault()
        prevSlide()
      } else if (event.code === 'KeyP' && event.ctrlKey) {
        event.preventDefault()
        setPresenterMode(!presenterMode)
      } else if (event.code === 'Escape') {
        setPresenterMode(false)
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [nextSlide, prevSlide, presenterMode, setPresenterMode])

  // Whenever the slide changes, slides change, or totalSeconds changes, restart the per-slide timer
  useEffect(() => {
    // Start a new timer after slide change
    startSlideTimer()

    // Cleanup on unmount or before next timer
    return () => {
      if (slideTimerRef.current) {
        window.clearTimeout(slideTimerRef.current)
        slideTimerRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSlideIndex, slides.length, totalSeconds])

  // Cleanup presenter window on unmount
  useEffect(() => {
    return () => {
      if (presenterWindow && !presenterWindow.closed) {
        presenterWindow.close()
      }
    }
  }, [])

  // Add helpful instructions when presenter mode is active
  useEffect(() => {
    if (presenterMode) {
      console.log(`
PRESENTER MODE ACTIVE 
------------------------
Current slide: ${currentSlideIndex + 1} of ${slides.length}

Navigation:
Use website navigation (← → arrows or buttons) to control slides and content

Tip: Keep this browser tab active to use keyboard shortcuts!
      `)
    }
  }, [presenterMode, currentSlideIndex, slides.length])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading presentation...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <h3 className="font-semibold mb-2">Error Loading Presentation</h3>
            <p className="text-sm text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!presentation || slides.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold mb-2">No Slides Found</h3>
            <p className="text-sm text-muted-foreground">
              This presentation doesn't have any slides to display.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const currentSlide = slides[currentSlideIndex]


  return (
    <div
      onKeyDown={handleKeyPress}
      className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-screen max-h-screen overflow-hidden"
    >
      {/* Slide Viewer - Left Side (2/3 width) */}
      <div className="lg:col-span-2 flex flex-col">
        {/* Header with navigation */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold">{presentation.title}</h1>
            <p className="text-sm text-muted-foreground">
              Slide {currentSlideIndex + 1} of {slides.length}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            {/* View Mode Toggle */}
            <div className="flex items-center space-x-1 mr-4">
              
              <Button
                variant={viewMode === 'embed' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('embed')}
                className="text-xs"
              >
                Live Slide
              </Button>
              {/* <Button
                variant={viewMode === 'content' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('content')}
                className="text-xs"
              >
                Content
              </Button> */}
              <Button
                variant={presenterMode ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPresenterMode(!presenterMode)}
                className="text-xs"
              >
                📺 Presenter Mode
              </Button>
              <CountdownButton totalSeconds={Number(totalSeconds) || 0} />
            </div>



            <Button
              variant="outline"
              size="sm"
              onClick={prevSlide}
              disabled={currentSlideIndex === 0}
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={nextSlide}
              disabled={currentSlideIndex >= slides.length - 1}
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Main Slide Display */}
        <Card className="flex-1 min-h-0">
          <CardContent className="p-6 h-full">
            <ScrollArea className="h-full">
              <div className="space-y-6">
                {/* Dynamic Slide Display based on view mode */}
                <div className="space-y-4">
                  {/* Live Google Slides Embed */}
                  {viewMode === 'embed' && presentation.source_url && presentation.source_url.includes('docs.google.com') && (
                    <div className="w-full space-y-4">
                      {/* Presenter Mode Controls */}
                      {presenterMode && (
                        <Card className="bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
                          <CardContent className="p-4 space-y-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                {/* <Badge variant="default" className="bg-blue-600">
                                  📺 Presenter Mode Active
                                </Badge> */}
                                <span className="text-sm text-blue-700 dark:text-blue-300">
                                  Share your screen with the presentation window for your audience
                                </span>
                              </div>
                              <Button
                                size="sm"
                                onClick={handleOpenPresenterWindow}
                                className="bg-blue-600 hover:bg-blue-700"
                                disabled={!presentation?.source_url}
                              >
                                🚀 {presenterWindow && !presenterWindow.closed ? 'Refresh' : 'Open'} Presentation Window
                              </Button>
                            </div>


                          </CardContent>
                        </Card>
                      )}

                      {/* Sync Information */}
                      {/* <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-4">
                        <div className="flex items-center space-x-2 text-sm text-blue-700 dark:text-blue-300">
                          <span className="font-medium">Synchronized Navigation:</span>
                          <span>Use the navigation buttons or keyboard arrows (← →) to control both the slide display and content below. The iframe will automatically load the correct slide.</span>
                        </div>
                      </div> */}

                      {/* Embedded Slide - synced with current slide */}
                      <div className="aspect-video w-full max-w-4xl mx-auto bg-gray-50 dark:bg-gray-900 rounded-lg overflow-hidden border-2 border-dashed border-gray-300 dark:border-gray-600 relative transition-all duration-300 ease-in-out">
                        {/* Smart preloaded iframes - keep visited slides + adjacent slides loaded */}
                        {slides.map((_, slideIndex) => {
                          const isCurrentSlide = slideIndex === currentSlideIndex
                          const isAdjacentSlide = Math.abs(slideIndex - currentSlideIndex) <= 1
                          const isVisitedSlide = visitedSlides.has(slideIndex)
                          const shouldLoad = isCurrentSlide || isAdjacentSlide || isVisitedSlide
                          
                          return shouldLoad ? (
                            <iframe
                              key={`slide-${slideIndex}`}
                              src={presentation.source_url ? (getGoogleSlidesEmbedUrl(presentation.source_url, slideIndex) || presentation.source_url) : ''}
                              className={`w-full h-full border-0 absolute inset-0 transition-opacity duration-150 ${
                                isCurrentSlide ? 'opacity-100 z-10' : 'opacity-0 z-0'
                              }`}
                              allowFullScreen
                              title={`Slide ${slideIndex + 1}: ${slides[slideIndex]?.title || 'Untitled'}`}
                              loading={isCurrentSlide || isAdjacentSlide ? "eager" : "lazy"}
                            />
                          ) : null
                        })}
                        {/* Overlay to prevent iframe interaction and maintain sync */}
                        <div 
                          className="absolute inset-0 bg-transparent cursor-pointer hover:bg-blue-500/5 transition-colors duration-150 z-20"
                          onClick={nextSlide}
                          title="Click to advance to next slide"
                        />
                      </div>
                      
                      {/* Preloading handled by the main iframe array above */}
                      <div className="text-center space-y-2 transition-all duration-200">
                        {/* <div className="flex items-center justify-center space-x-2">
                          <Badge variant="default" className={`text-xs transition-all duration-200 ${slideLoading ? 'animate-pulse' : ''}`}>
                            {slideLoading ? '⟳ Loading' : '🔴 Live'} Slide {currentSlideIndex + 1} of {slides.length}
                          </Badge>
                          <Badge variant="outline" className="text-xs transition-all duration-200 hover:bg-muted">
                            {currentSlide.title || 'Untitled'}
                          </Badge>
                        </div> */}
{/* <!--                         <p className="text-xs text-muted-foreground max-w-md mx-auto">
                          {presenterMode --> */}
                        <p className="text-s text-muted-foreground max-w-md mx-auto transition-opacity duration-200">
                          {presenterMode 
                            ? "🎭 Presenter Mode: Use navigation buttons or keyboard arrows (← →) to control both slides and content."
                            : "⚡ Use keyboard arrows (← →) or navigation buttons above to change slides."}
                        </p>
                      </div>
                    </div>
                  )}



                  {/* Content-only View */}
                  {/*viewMode === 'content' && (
                    <div className="max-w-4xl mx-auto">
                      <ScrollArea className="max-h-[65vh] p-8">
                        {currentSlide.title && (
                          <h2 className="text-3xl font-bold mb-6 text-center">{currentSlide.title}</h2>
                        )}
                        {currentSlide.content && (
                          <div className="prose prose-lg max-w-none">
                            <div className="whitespace-pre-wrap leading-relaxed">
                              {currentSlide.content}
                            </div>
                          </div>
                        )}
                        {!currentSlide.content && !currentSlide.title && (
                          <div className="text-center py-12 text-muted-foreground">
                            <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
                            <p>No text content extracted for this slide</p>
                          </div>
                        )}
                      </ScrollArea>
                    </div>
                  )*/}
                  
                  {/* Fallback when embed is not available */}
                  {viewMode === 'embed' && (!presentation.source_url || !presentation.source_url.includes('docs.google.com')) && (
                    <div className="text-center py-12">
                      <Card className="max-w-md mx-auto">
                        <CardContent className="pt-6">
                          <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                          <h3 className="font-semibold mb-2">Live Embed Not Available</h3>
                          <p className="text-sm text-muted-foreground mb-4">
                            This presentation cannot be embedded. Switch to Content view to see the extracted text.
                          </p>
                          <div className="flex justify-center">
                            <Button size="sm" variant="outline" onClick={() => setViewMode('content')}>
                              View Content
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  )}
                </div>

                {/* Slide Content */}
                <div className="space-y-4">
                  {/* {currentSlide.title && (
                    <div>
                      <h2 className="text-xl font-semibold mb-3">{currentSlide.title}</h2>
                    </div>
                  )}

                  {currentSlide.content && (
                    <div className="prose prose-sm max-w-none">
                      <div className="bg-muted/30 p-4 rounded-lg">
                      </div>
                    </div>
                  )} */}

                  {/* Speaker Notes */}
                  {currentSlide.speaker_notes && (
                    <div>
                      <Separator className="my-4" />
                      <div className="bg-blue-50 dark:bg-blue-950/30 p-4 rounded-lg">
                        <h3 className="text-sm font-medium mb-2 flex items-center text-blue-700 dark:text-blue-300">
                          <MessageCircle className="w-4 h-4 mr-2" />
                          Speaker Notes
                        </h3>
                        <p className="text-sm text-blue-600 dark:text-blue-200 leading-relaxed">
                          {currentSlide.speaker_notes}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* AI Suggestions Panel - Right Side (1/3 width) */}
      <div className="flex flex-col h-full max-h-screen">
        <Card className="flex-1 flex flex-col min-h-0 h-full">
          <CardHeader className="flex-shrink-0 pb-3">
            <CardTitle className="flex items-center space-x-2 text-lg">
              <Lightbulb className="w-5 h-5" />
              <span>AI Suggestions</span>
            </CardTitle>
            <CardDescription>
              Real-time assistance for slide {currentSlideIndex + 1} of {slides.length}
            </CardDescription>
            <div className="mt-3 flex space-x-2">
              <VoiceRecorder onTranscript={setTranscript} />
              <Button 
                variant="outline" 
                onClick={sendSummaryQuery}
                disabled={summaryLoading || slides.length === 0}
              >
                <FileText className="w-4 h-4 mr-2" />
                {summaryLoading ? "Generating..." : "Download Full Summary"}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="flex-1 overflow-hidden p-4">
            {/* Pacing reminder shown when per-slide duration has elapsed */}
            {pacingReminderActive && (
              <div className="mb-3 w-88">
                <Card className="p-3 border-yellow-200 bg-yellow-50">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <AlertCircle className="w-5 h-5 text-yellow-700" />
                      <div>
                        <div className="font-medium">Pacing Reminder</div>
                        <div className="text-sm text-muted-foreground">It might be time to transition to the next slide.</div>
                      </div>
                    </div>
                    <div>
                      <Button size="sm" variant="outline" onClick={() => setPacingReminderActive(false)}>Dismiss</Button>
                    </div>
                  </div>
                </Card>
              </div>
            )}
            {suggestionsLoading ? (
              <div className="flex items-center justify-center h-32">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                  <p className="text-sm text-muted-foreground">Analyzing slide...</p>
                </div>
              </div>
            ) : suggestions.length > 0 ? (
              <ScrollArea className="h-full pr-4">
                <div className="space-y-3">
                  {/* Agent response (from Flask) shown at the top if available */}
                  {response && (
                    <Card className="p-3 border-primary/30">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center space-x-2 flex-1 min-w-0">
                          <Lightbulb className="w-4 h-4" />
                          <span className="font-medium text-sm truncate">Agent Suggestion</span>
                        </div>
                        <Badge variant="default" className="text-xs flex-shrink-0 ml-2">
                          live
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                        {response}
                      </p>
                    </Card>
                  )}
                  {suggestions.map((suggestion, index) => (
                    <Card key={index} className="p-3 hover:bg-muted/30 transition-colors border border-muted">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center space-x-2 flex-1 min-w-0">
                          {getSuggestionIcon(suggestion.type)}
                          <span className="font-medium text-sm truncate">{suggestion.title}</span>
                        </div>
                        <Badge variant={getPriorityColor(suggestion.priority)} className="text-xs flex-shrink-0 ml-2">
                          {suggestion.priority}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {suggestion.content}
                      </p>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                <Lightbulb className="w-12 h-12 mb-4 opacity-50" />
                <p className="font-medium mb-2">No suggestions available</p>
                <p className="text-sm">AI suggestions will appear here as you navigate through your slides.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}