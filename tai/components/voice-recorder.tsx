"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export function VoiceRecorder() {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<BlobPart[]>([])
  const [recording, setRecording] = useState(false)
  const [support, setSupport] = useState(false)
  const [status, setStatus] = useState<string>("")
  const [transcript, setTranscript] = useState<string>("")
  const [fileUrl, setFileUrl] = useState<string>("")

  useEffect(() => {
    setSupport(typeof window !== "undefined" && !!navigator.mediaDevices && typeof MediaRecorder !== "undefined")
  }, [])

  const startRecording = async () => {
    try {
      setTranscript("")
      setFileUrl("")
      setStatus("Requesting microphone…")
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "audio/ogg"
      const recorder = new MediaRecorder(stream, { mimeType })
      mediaRecorderRef.current = recorder
      chunksRef.current = []
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data)
        }
      }
      recorder.onstart = () => setStatus("Recording…")
      recorder.onstop = async () => {
        setStatus("Processing…")
        const blob = new Blob(chunksRef.current, { type: mimeType })
        // Prefer multipart form for compatibility with our API
        const formData = new FormData()
        formData.append("audio", blob, `audio-${Date.now()}.webm`)
        try {
          const res = await fetch("/api/stt", { method: "POST", body: formData })
          const data = await res.json()
          if (!res.ok) throw new Error(data?.error || "Transcription failed")
          setTranscript(data.transcript || "")
          setFileUrl(data.file || "")
          setStatus("Done")
        } catch (err: any) {
          setStatus(err?.message || "Upload failed")
        }
      }
      recorder.start(250) // small timeslice to flush chunks
      setRecording(true)
    } catch (err: any) {
      setStatus(err?.message || "Microphone permission denied")
      setRecording(false)
    }
  }

  const stopRecording = () => {
    const recorder = mediaRecorderRef.current
    if (recorder && recorder.state !== "inactive") {
      recorder.stop()
      // stop all tracks
      recorder.stream.getTracks().forEach((t) => t.stop())
    }
    setRecording(false)
  }

  if (!support) {
    return (
      <Card className="p-3 text-sm text-muted-foreground">Your browser doesn’t support in-browser recording.</Card>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        {!recording ? (
          <Button size="sm" onClick={startRecording}>🎙️ Record</Button>
        ) : (
          <Button size="sm" variant="destructive" onClick={stopRecording}>■ Stop</Button>
        )}
        {status && <Badge variant="outline" className="text-xs">{status}</Badge>}
      </div>
      {transcript && (
        <Card className="p-3 text-sm whitespace-pre-wrap">
          {transcript}
          {fileUrl && (
            <div className="mt-2 text-xs text-muted-foreground">
              Saved: <a className="underline" href={fileUrl} target="_blank" rel="noreferrer">{fileUrl}</a>
            </div>
          )}
        </Card>
      )}
    </div>
  )
}
