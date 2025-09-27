"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Upload, Link, FileText, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface SlideImporterProps {
  onSlidesImported: (slides: any[]) => void
}

export function SlideImporter({ onSlidesImported }: SlideImporterProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [googleSlidesUrl, setGoogleSlidesUrl] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.name.endsWith(".pptx") && !file.name.endsWith(".ppt")) {
      toast({
        title: "Invalid file type",
        description: "Please upload a PowerPoint file (.pptx or .ppt)",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    try {
      const formData = new FormData()
      formData.append("file", file)

      const response = await fetch("/api/slides/upload", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        throw new Error("Failed to upload file")
      }

      const data = await response.json()
      onSlidesImported(data.slides)

      toast({
        title: "Slides imported successfully",
        description: `${data.slides.length} slides imported from ${file.name}`,
      })
    } catch (error) {
      toast({
        title: "Import failed",
        description: "Failed to import slides. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleSlidesImport = async () => {
    if (!googleSlidesUrl) {
      toast({
        title: "URL required",
        description: "Please enter a Google Slides URL",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch("/api/slides/google", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url: googleSlidesUrl }),
      })

      if (!response.ok) {
        throw new Error("Failed to import Google Slides")
      }

      const data = await response.json()
      onSlidesImported(data.slides)

      toast({
        title: "Google Slides imported",
        description: `${data.slides.length} slides imported successfully`,
      })

      setGoogleSlidesUrl("")
    } catch (error) {
      toast({
        title: "Import failed",
        description: "Failed to import Google Slides. Please check the URL and try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* File Upload */}
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              <Label className="text-base font-medium">Upload PowerPoint File</Label>
            </div>

            <div
              className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-sm text-muted-foreground mb-2">Click to upload or drag and drop</p>
              <p className="text-xs text-muted-foreground">Supports .pptx and .ppt files</p>
            </div>

            <Input ref={fileInputRef} type="file" accept=".pptx,.ppt" onChange={handleFileUpload} className="hidden" />
          </div>
        </CardContent>
      </Card>

      {/* Google Slides Import */}
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Link className="h-5 w-5" />
              <Label className="text-base font-medium">Import from Google Slides</Label>
            </div>

            <div className="flex gap-2">
              <Input
                placeholder="Paste Google Slides URL here..."
                value={googleSlidesUrl}
                onChange={(e) => setGoogleSlidesUrl(e.target.value)}
                disabled={isLoading}
              />
              <Button onClick={handleGoogleSlidesImport} disabled={isLoading || !googleSlidesUrl}>
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Import"}
              </Button>
            </div>

            <p className="text-xs text-muted-foreground">
              Make sure your Google Slides is set to "Anyone with the link can view"
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
