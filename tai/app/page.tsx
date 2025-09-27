"use client"

import { useState, useEffect } from "react"
import { useSession, signIn, signOut } from "next-auth/react"
import { SlideImporter } from "@/components/slide-importer"
import { PresentationViewer } from "@/components/presentation-viewer"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { PlayCircle, FileText, Calendar, ChevronRight, LogIn } from "lucide-react"

interface Presentation {
  id: number
  presentation_id: string
  title: string
  slide_count: number
  created_at: string
  updated_at: string
}

export default function Home() {
  const { data: session, status } = useSession()
  const [presentations, setPresentations] = useState<Presentation[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPresentationId, setSelectedPresentationId] = useState<string | null>(null)

  // Automatically sign out if there's an auth error to clear corrupted session
  useEffect(() => {
    if (session?.error === "RefreshTokenExpired" || session?.error === "NoRefreshToken") {
      console.log('🔄 Authentication error detected, signing out automatically')
      signOut({ redirect: false })
    }
  }, [session?.error])

  useEffect(() => {
    if (session) {
      loadPresentations()
    }
  }, [session])

  const loadPresentations = async () => {
    try {
      const response = await fetch("/api/presentations")
      if (response.ok) {
        const data = await response.json()
        setPresentations(data.presentations || [])
      } else if (response.status === 401) {
        // Authentication issue - force session refresh
        console.log("🔄 Authentication error, refreshing session...")
        window.location.reload()
      }
    } catch (error) {
      console.error("Error loading presentations:", error)
    } finally {
      setLoading(false)
    }
  }

  const handlePresentationSelect = (presentationId: string) => {
    setSelectedPresentationId(presentationId)
  }

  const handleBackToList = () => {
    setSelectedPresentationId(null)
    // Reload presentations to get any updates
    loadPresentations()
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  if (status === "loading") {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </main>
    )
  }

  // Handle authentication errors (like expired refresh token)
  if (session?.error === "RefreshTokenExpired" || session?.error === "NoRefreshToken") {
    return (
      <main className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-16 max-w-md">
          <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950/30">
            <CardHeader className="text-center">
              <CardTitle className="text-yellow-800 dark:text-yellow-200">Authentication Required</CardTitle>
              <CardDescription className="text-yellow-700 dark:text-yellow-300">
                Your Google authentication session needs to be refreshed. Please sign in again to continue.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                          <CardFooter className="flex justify-center">
              <Button 
                onClick={async () => {
                  // Clear the corrupted session first
                  await signOut({ redirect: false })
                  // Then sign in fresh
                  signIn('google')
                }} 
                className="bg-yellow-600 hover:bg-yellow-700 text-white"
              >
                <LogIn className="mr-2 h-4 w-4" />
                Sign In Again
              </Button>
            </CardFooter>
              <p className="text-xs text-yellow-600 dark:text-yellow-400 text-center">
                This happens periodically for security. Your presentations are safe.
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    )
  }

  if (!session) {
    return (
      <main className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto">
            {/* Header */}
            <div className="text-center mb-12">
              <h1 className="text-4xl font-bold text-foreground mb-4">Presenter Assist</h1>
              <p className="text-lg text-muted-foreground">
                Import your Google Slides to get started with AI-powered presentation assistance
              </p>
            </div>

            {/* Login Card */}
            <Card className="w-full">
              <CardHeader className="text-center">
                <CardTitle className="text-2xl">Welcome to TA.I</CardTitle>
                <CardDescription>
                  Sign in with your Google account to import and analyze your presentations
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="text-center">
                  <Button 
                    onClick={() => signIn("google")}
                    size="lg"
                    className="w-full max-w-sm"
                  >
                    <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                      <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    Sign in with Google
                  </Button>
                </div>
                
                <div className="text-sm text-muted-foreground text-center space-y-2">
                  <p><strong>What you can do:</strong></p>
                  <ul className="text-left max-w-sm mx-auto space-y-1">
                    <li>• Import Google Slides presentations</li>
                    <li>• Extract slide content and speaker notes</li>
                    <li>• Get AI-powered presentation insights</li>
                    <li>• Organize and manage your presentations</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    )
  }

  // Show presentation viewer if a presentation is selected
  if (selectedPresentationId) {
    return (
      <div className="min-h-screen">
        <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container mx-auto px-4 py-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBackToList}
              className="mb-2"
            >
              ← Back to Presentations
            </Button>
          </div>
        </div>
        <div className="container mx-auto px-4 py-6">
          <PresentationViewer presentationId={selectedPresentationId} />
        </div>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-background">
      {/* Header with user info */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Presenter Assist</h1>
              <p className="text-sm text-muted-foreground">AI-powered presentation tools</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium">{session.user?.name || session.user?.email}</p>
                <p className="text-xs text-muted-foreground">Signed in</p>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => signOut()}
              >
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Import Section */}
          <div className="mb-12">
            <SlideImporter onImportSuccess={loadPresentations} />
          </div>

          {/* Presentations Section */}
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold">Your Presentations</h2>
              {presentations.length > 0 && (
                <Badge variant="secondary">{presentations.length} presentation(s)</Badge>
              )}
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : presentations.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-medium mb-2">No presentations yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Import your first presentation from Google Slides to get started
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {presentations.map((presentation) => (
                  <Card key={presentation.id} className="hover:shadow-md transition-shadow cursor-pointer">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg mb-2 line-clamp-2">
                            {presentation.title}
                          </CardTitle>
                          <CardDescription className="flex items-center space-x-4 text-sm">
                            <span className="flex items-center space-x-1">
                              <FileText className="w-4 h-4" />
                              <span>{presentation.slide_count} slides</span>
                            </span>
                            <span className="flex items-center space-x-1">
                              <Calendar className="w-4 h-4" />
                              <span>{formatDate(presentation.updated_at)}</span>
                            </span>
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Button
                        onClick={() => handlePresentationSelect(presentation.presentation_id)}
                        className="w-full"
                        size="sm"
                      >
                        <PlayCircle className="w-4 h-4 mr-2" />
                        Start Presenting
                        <ChevronRight className="w-4 h-4 ml-2" />
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
