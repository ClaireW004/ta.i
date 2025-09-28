import { NextRequest, NextResponse } from "next/server"
import { SpeechClient } from "@google-cloud/speech"
import { promises as fs } from "fs"
import path from "path"

// Accept POST with raw audio (webm/opus) or multipart form and transcribe via Google Cloud Speech
export async function POST(req: NextRequest) {
  try {
    // Try multipart form first (file input named 'audio')
    let audioBuffer: Buffer | null = null
    let contentType = req.headers.get("content-type") || ""

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData()
      const file = formData.get("audio") as File | null
      if (!file) {
        return NextResponse.json({ error: "No 'audio' file provided" }, { status: 400 })
      }
      const arrayBuf = await file.arrayBuffer()
      audioBuffer = Buffer.from(arrayBuf)
      contentType = file.type || contentType
    } else {
      // Otherwise, read body as ArrayBuffer (fetch with body Blob)
      const arrayBuf = await req.arrayBuffer()
      if (!arrayBuf || arrayBuf.byteLength === 0) {
        return NextResponse.json({ error: "Empty request body" }, { status: 400 })
      }
      audioBuffer = Buffer.from(arrayBuf)
    }

  // Determine encoding/sampleRate hints for web recorder defaults
  // Most browsers record as webm/opus at 48kHz using MediaRecorder
  const isWebm = contentType.includes("webm")
  const isOggOrOpus = contentType.includes("ogg") || contentType.includes("opus")

    const client = new SpeechClient()
    const [response] = await client.recognize({
      audio: { content: audioBuffer.toString("base64") },
      config: {
        languageCode: "en-US",
        enableAutomaticPunctuation: true,
        model: "latest_long", // Cloud STT model; for Vertex Speech, routing uses same client when properly authorized
        // Use WEBM_OPUS for webm container; OGG_OPUS for ogg/opus containers
        encoding: isWebm ? ("WEBM_OPUS" as any) : isOggOrOpus ? ("OGG_OPUS" as any) : undefined,
        sampleRateHertz: isWebm || isOggOrOpus ? 48000 : undefined,
      },
    })

    const transcript = (response.results || [])
      .map(r => r.alternatives?.[0]?.transcript ?? "")
      .join(" ")
      .trim()

    // Persist transcript under public/transcripts with a timestamped filename
    const transcriptsDir = path.join(process.cwd(), "public", "transcripts")
    await fs.mkdir(transcriptsDir, { recursive: true })
    const filename = `transcript_${Date.now()}.txt`
    const filePath = path.join(transcriptsDir, filename)
    await fs.writeFile(filePath, transcript || "")

    return NextResponse.json({
      transcript,
      file: `/transcripts/${filename}`,
    })
  } catch (err: any) {
    console.error("STT error:", err)
    // Surface a clearer message if the API is disabled in the target project
    const message: string = err?.message || "Speech-to-Text failed"
    const activationUrl: string | undefined = err?.errorInfoMetadata?.activationUrl
    const code: number | undefined = err?.code
    const reason: string | undefined = err?.reason
    const details = {
      error: message,
      code,
      reason,
      activationUrl,
    }
    // Use 403 for permission issues; otherwise 500
    const status = code === 7 || reason === "SERVICE_DISABLED" ? 403 : 500
    return NextResponse.json(details, { status })
  }
}

export const runtime = "nodejs"