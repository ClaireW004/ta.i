import { type NextRequest, NextResponse } from "next/server"
import JSZip from "jszip"
import { gcs } from "@/lib/cloud-storage"
import { db } from "@/lib/database"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File
    const durationSecondsRaw = formData.get("duration_seconds")

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    const name = file.name || "presentation"
    if (!name.toLowerCase().endsWith(".pptx") && !name.toLowerCase().endsWith(".ppt")) {
      return NextResponse.json({ error: "Invalid file type. Please upload a PowerPoint file." }, { status: 400 })
    }

    if (name.toLowerCase().endsWith(".ppt")) {
      return NextResponse.json({ error: "Legacy .ppt not supported for automatic handling. Please convert to .pptx." }, { status: 400 })
    }

    const arrayBuffer = await file.arrayBuffer()
    const zip = await JSZip.loadAsync(arrayBuffer)
    const slideFiles = Object.keys(zip.files).filter((k) => /^ppt\/slides\/slide\d+\.xml$/.test(k))
    const slideCount = slideFiles.length

    // Upload the file to storage (dev: local .storage)
    const buffer = Buffer.from(arrayBuffer)
    const objectPath = `uploads/${Date.now()}-${name}`
    const storageUrl = await gcs.uploadFile(process.env.GCS_BUCKET, objectPath, buffer)

    // Create presentation record in DB
    const presentationId = `pptx-${Date.now()}`
    const title = name.replace(/\.(pptx)$/i, "")
    const durationSeconds = durationSecondsRaw ? parseInt(String(durationSecondsRaw), 10) : null

    const presentationRecord = await db.createPresentation({
      presentation_id: presentationId,
      title,
      source_type: 'pptx',
      source_url: undefined,
      slide_count: slideCount,
      created_by: 'unknown',
      gcs_bucket: process.env.GCS_BUCKET,
      locale: undefined,
      status: 'completed',
    })

    // Store metadata in storage as well
    await gcs.uploadPresentationMetadata(presentationId, {
      id: presentationId,
      title,
      slideCount,
      storageUrl,
      importedAt: new Date().toISOString(),
    })

    return NextResponse.json({
      id: presentationId,
      title,
      slideCount,
      source: 'pptx',
      storageUrl,
    })
  } catch (error) {
    console.error("PPTX import error:", error)
    return NextResponse.json({ error: "Failed to import PowerPoint file" }, { status: 500 })
  }
}
