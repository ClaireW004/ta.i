"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FileText, Presentation, Mic } from "lucide-react"
import { SlideImporter } from "@/components/slide-importer"
import { PresenterMode } from "@/components/presenter-mode"

export default function HomePage() {
  const [slides, setSlides] = useState<any[]>([])
  const [isPresenting, setIsPresenting] = useState(false)
  const [presentationMode, setPresentationMode] = useState<"setup" | "presenting">("setup")

  const handleSlidesImported = (importedSlides: any[]) => {
    setSlides(importedSlides)
  }

  const startPresentation = () => {
    if (slides.length > 0) {
      setIsPresenting(true)
      setPresentationMode("presenting")
    }
  }

  const stopPresentation = () => {
    setIsPresenting(false)
    setPresentationMode("setup")
  }

  if (presentationMode === "presenting") {
    return <PresenterMode slides={slides} onStop={stopPresentation} />
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-foreground">Presenter Assist</h1>
          <p className="text-muted-foreground text-lg">AI-powered presentation assistant with real-time feedback</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Presentation className="h-5 w-5" />
              Setup Your Presentation
            </CardTitle>
            <CardDescription>Import your slides and configure your presentation settings</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="import" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="import">Import Slides</TabsTrigger>
                <TabsTrigger value="settings">Settings</TabsTrigger>
              </TabsList>

              <TabsContent value="import" className="space-y-4">
                <SlideImporter onSlidesImported={handleSlidesImported} />

                {slides.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">{slides.length} slides imported</p>
                      <Button onClick={startPresentation} className="flex items-center gap-2">
                        <Mic className="h-4 w-4" />
                        Start Presentation
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {slides.slice(0, 8).map((slide, index) => (
                        <Card key={index} className="p-2">
                          <div className="aspect-video bg-muted rounded flex items-center justify-center">
                            <FileText className="h-8 w-8 text-muted-foreground" />
                          </div>
                          <p className="text-xs text-center mt-2 truncate">Slide {index + 1}</p>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="settings" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="wpm-target">Target Words Per Minute</Label>
                    <Input id="wpm-target" type="number" defaultValue="150" min="100" max="300" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="slide-duration">Target Slide Duration (seconds)</Label>
                    <Input id="slide-duration" type="number" defaultValue="60" min="30" max="300" />
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
