"use client"

import type React from "react"

import { useState, useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import styles from "./slide-importer.module.css"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Upload, FileText, ExternalLink, CheckCircle, AlertCircle, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface SlideImportResult {
  id: string
  title: string
  slideCount: number
  source: "google-slides" | "pptx"
}

interface SlideImporterProps {
  onImportSuccess?: () => void | Promise<void>
}

export function SlideImporter({ onImportSuccess }: SlideImporterProps = {}) {
  const [isLoading, setIsLoading] = useState(false)
  const [importResult, setImportResult] = useState<SlideImportResult | null>(null)
  const [googleSlidesUrl, setGoogleSlidesUrl] = useState("")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [hours, setHours] = useState<string>("")
  const [minutes, setMinutes] = useState<string>("")
  const { toast } = useToast()
  const router = useRouter()

  const totalSeconds = useMemo(() => {
    const h = parseInt(hours, 10) || 0
    const m = parseInt(minutes, 10) || 0
    return h * 3600 + m * 60
  }, [hours, minutes])

  // Google Slides OAuth2 integration
  const handleGoogleSlidesImport = useCallback(async () => {
    if (!googleSlidesUrl.trim()) {
      toast({
        title: "URL Required",
        description: "Please enter a Google Slides URL",
        variant: "destructive",
      })
      return
    }

    // Validate Google Slides URL format
    const googleSlidesRegex = /^https:\/\/docs\.google\.com\/presentation\/d\/([a-zA-Z0-9-_]+)/
    if (!googleSlidesRegex.test(googleSlidesUrl)) {
      toast({
        title: "Invalid URL",
        description: "Please enter a valid Google Slides URL",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    try {
      // Extract presentation ID from URL
      const match = googleSlidesUrl.match(googleSlidesRegex)
      const presentationId = match?.[1]

      // Call API to import Google Slides
      const response = await fetch("/api/slides/import/google", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          presentationId,
          url: googleSlidesUrl,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to import Google Slides")
      }

      const result = await response.json()
      setImportResult({
        id: result.id,
        title: result.title,
        slideCount: result.slideCount,
        source: "google-slides",
      })

      toast({
        title: "Import Successful",
        description: `Imported "${result.title}" with ${result.slideCount} slides`,
      })

      // Call the success callback if provided
      if (onImportSuccess) {
        await onImportSuccess()
      }

      setGoogleSlidesUrl("")
    } catch (error) {
      console.error("Google Slides import error:", error)
      toast({
        title: "Import Failed",
        description: "Failed to import Google Slides. Please check the URL and try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }, [googleSlidesUrl, toast])

  // PPTX file upload
  const handleFileUpload = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (!file) return

      // Validate file type
      if (!file.name.toLowerCase().endsWith(".pptx") && !file.name.toLowerCase().endsWith(".ppt")) {
        toast({
          title: "Invalid File Type",
          description: "Please select a PowerPoint file (.ppt or .pptx)",
          variant: "destructive",
        })
        return
      }

      // Validate file size (max 50MB)
      if (file.size > 50 * 1024 * 1024) {
        toast({
          title: "File Too Large",
          description: "Please select a file smaller than 50MB",
          variant: "destructive",
        })
        return
      }

      setSelectedFile(file)
    },
    [toast],
  )

  const handlePptxImport = useCallback(async () => {
    if (!selectedFile) {
      toast({
        title: "File Required",
        description: "Please select a PowerPoint file",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    try {
      const formData = new FormData()
      formData.append("file", selectedFile)

      const response = await fetch("/api/slides/import/pptx", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        throw new Error("Failed to import PowerPoint file")
      }

      const result = await response.json()
      setImportResult({
        id: result.id,
        title: result.title,
        slideCount: result.slideCount,
        source: "pptx",
      })

      toast({
        title: "Import Successful",
        description: `Imported "${result.title}" with ${result.slideCount} slides`,
      })

      // Call the success callback if provided
      if (onImportSuccess) {
        await onImportSuccess()
      }

      setSelectedFile(null)
      // Reset file input
      const fileInput = document.getElementById("pptx-file") as HTMLInputElement
      if (fileInput) fileInput.value = ""
    } catch (error) {
      console.error("PPTX import error:", error)
      toast({
        title: "Import Failed",
        description: "Failed to import PowerPoint file. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }, [selectedFile, toast])

  const resetImport = () => {
    setImportResult(null)
    setGoogleSlidesUrl("")
    setSelectedFile(null)
  }

  const startPresentation = () => {
    if (!importResult) {
      toast({
        title: "No Presentation",
        description: "Please import a presentation first",
        variant: "destructive",
      })
      return
    }

    router.push(`/present/${importResult.id}`)
  }

  if (importResult) {
    return (
      <Card className={`w-full ${styles.cardRoot}`}>
        <CardHeader className="text-center">
          <div className={`${styles.headerIcon} mx-auto mb-4 bg-green-100 dark:bg-green-900`}>
            <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
          </div>
          <CardTitle className="text-2xl">Import Successful!</CardTitle>
          <CardDescription>Your slides have been imported and are ready for presentation assistance</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className={`${styles.mutedPanel}`}>
            <div className="flex items-center gap-3 mb-2">
              <FileText className="w-5 h-5 text-muted-foreground" />
              <span className="font-medium">{importResult.title}</span>
            </div>
            <div className="text-sm text-muted-foreground">
              {importResult.slideCount} slides • Imported from{" "}
              {importResult.source === "google-slides" ? "Google Slides" : "PowerPoint"}
            </div>
          </div>

          <div className={styles.actions}>
            <Button onClick={resetImport} variant="outline" className="flex-1 bg-transparent">
              Import Another Presentation
            </Button>
            <Button onClick={startPresentation} className="flex-1">Start Presenting</Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div>
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Presentation Time
          </CardTitle>
          <CardDescription>Enter your total presentation time</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className={styles.timeWrapper}>
              <div className={styles.timeRow}>
                <div className={styles.timeGroup}>
                  <input id="hours" name="hours" type="text" className={styles.timeInput} placeholder="hh" value={hours} onChange={(e) => setHours(e.target.value)} />
                  <label htmlFor="hours" className={styles.timeLabel}>hours</label>
                </div>

                <div className={styles.timeGroup}>
                  <input id="minutes" name="minutes" type="text" className={styles.timeInput} placeholder="mm" value={minutes} onChange={(e) => setMinutes(e.target.value)} />
                  <label htmlFor="minutes" className={styles.timeLabel}>minutes</label>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      <br />
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Import Slides
          </CardTitle>
          <CardDescription>Import your presentation from Google Slides or upload a PowerPoint file</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="google-slides" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="google-slides" className="flex items-center gap-2">
                <ExternalLink className="w-4 h-4" />
                Google Slides
              </TabsTrigger>
              <TabsTrigger value="pptx" className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                PowerPoint
              </TabsTrigger>
            </TabsList>

            <TabsContent value="google-slides" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="google-slides-url">Google Slides URL</Label>
                <Input
                  id="google-slides-url"
                  type="url"
                  placeholder="https://docs.google.com/presentation/d/..."
                  value={googleSlidesUrl}
                  onChange={(e) => setGoogleSlidesUrl(e.target.value)}
                  disabled={isLoading}
                />
                <p className="text-sm text-muted-foreground">
                  Paste the URL of your Google Slides presentation. Make sure it's shared publicly or with your account.
                </p>
              </div>

              <Button
                onClick={handleGoogleSlidesImport}
                disabled={isLoading || !googleSlidesUrl.trim()}
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Import from Google Slides
                  </>
                )}
              </Button>
            </TabsContent>

            <TabsContent value="pptx" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="pptx-file">PowerPoint File</Label>
                <Input id="pptx-file" type="file" accept=".ppt,.pptx" onChange={handleFileUpload} disabled={isLoading} />
                <p className="text-sm text-muted-foreground">
                  Upload a PowerPoint file (.ppt or .pptx). Maximum file size: 50MB.
                </p>
              </div>

              {selectedFile && (
                <div className="bg-muted rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{selectedFile.name}</span>
                    <span className="text-sm text-muted-foreground">
                      ({(selectedFile.size / 1024 / 1024).toFixed(1)} MB)
                    </span>
                  </div>
                </div>
              )}

              <Button onClick={handlePptxImport} disabled={isLoading || !selectedFile} className="w-full">
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Import PowerPoint File
                  </>
                )}
              </Button>
            </TabsContent>
          </Tabs>

          <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-blue-900 dark:text-blue-100 mb-1">Privacy & Security</p>
                <p className="text-blue-700 dark:text-blue-300">
                  Your slides are processed securely and stored temporarily for presentation assistance. All data is
                  encrypted and can be deleted at any time.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
