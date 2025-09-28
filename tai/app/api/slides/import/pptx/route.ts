// import { type NextRequest, NextResponse } from "next/server"
// import JSZip from "jszip"
// import { gcs } from "@/lib/cloud-storage"
// import { db } from "@/lib/database"
// import fs from 'fs'
// import os from 'os'
// import path from 'path'
// import { promisify } from 'util'
// import { execFile } from 'child_process'

// const execFileAsync = promisify(execFile)

// async function findSofficeExecutable(): Promise<string | null> {
//   const candidates: Array<string | undefined> = [
//     process.env.SOFFICE_PATH,
//     'soffice',
//     'soffice.exe',
//     'libreoffice',
//     path.join(process.env['ProgramFiles'] || '', 'LibreOffice', 'program', 'soffice.exe'),
//     path.join(process.env['ProgramFiles(x86)'] || '', 'LibreOffice', 'program', 'soffice.exe'),
//     '/usr/bin/soffice',
//     '/usr/local/bin/soffice',
//   ]

//   for (const cmd of candidates) {
//     if (!cmd) continue
//     try {
//       // Run a lightweight probe to ensure the executable exists and runs
//       await execFileAsync(cmd, ['--version'], { timeout: 5000 })
//       return cmd
//     } catch (err) {
//       // ignore and try next
//       continue
//     }
//   }

//   return null
// }

// export async function POST(request: NextRequest) {
//   try {
//     const formData = await request.formData()
//     const file = formData.get("file") as File
//   const durationSecondsRaw = formData.get("duration_seconds")

//     if (!file) {
//       return NextResponse.json({ error: "No file provided" }, { status: 400 })
//     }

//     const name = file.name || "presentation"
//     if (!name.toLowerCase().endsWith(".pptx") && !name.toLowerCase().endsWith(".ppt")) {
//       return NextResponse.json({ error: "Invalid file type. Please upload a PowerPoint file." }, { status: 400 })
//     }

//     if (name.toLowerCase().endsWith(".ppt")) {
//       return NextResponse.json({ error: "Legacy .ppt not supported for automatic handling. Please convert to .pptx." }, { status: 400 })
//     }

//     const arrayBuffer = await file.arrayBuffer()
//     const zip = await JSZip.loadAsync(arrayBuffer)
//     const slideFiles = Object.keys(zip.files).filter((k) => /^ppt\/slides\/slide\d+\.xml$/.test(k))
//     const slideCount = slideFiles.length

//     // Save uploaded PPTX to a temp file so LibreOffice can read it
//     const tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'pptx-'))
//     const tmpFilePath = path.join(tmpDir, name)
//     const buffer = Buffer.from(arrayBuffer)
//     await fs.promises.writeFile(tmpFilePath, buffer)

//     // Upload original PPTX to storage
//     const objectPath = `uploads/${Date.now()}-${name}`
//     const storageUrl = await gcs.uploadFile(process.env.GCS_BUCKET, objectPath, buffer)

//     // Create presentation record in DB (status=processing while we convert)
//     const presentationId = `pptx-${Date.now()}`
//     const title = name.replace(/\.(pptx)$/i, "")
//   const durationSeconds = durationSecondsRaw ? parseInt(String(durationSecondsRaw), 10) : null

//     const presentationRecord = await db.createPresentation({
//       presentation_id: presentationId,
//       title,
//       source_type: 'pptx',
//       source_url: storageUrl,
//       slide_count: slideCount,
//       created_by: 'unknown',
//       gcs_bucket: process.env.GCS_BUCKET,
//       locale: undefined,
//       status: 'processing',
//       total_seconds: durationSeconds,
//     })

//     // Convert PPTX to PNG thumbnails using LibreOffice (soffice) - output to tmpDir
//     try {
//       // Find soffice executable
//       const sofficeCmd = await findSofficeExecutable()
//       if (!sofficeCmd) {
//         return NextResponse.json({ error: 'LibreOffice (soffice) not found. Please install LibreOffice and ensure `soffice` is on PATH or set SOFFICE_PATH to the executable.' }, { status: 500 })
//       }

//       // soffice will place output files (one image per slide) in tmpDir
//       // Command: <sofficeCmd> --headless --convert-to png --outdir <tmpDir> <tmpFilePath>
//       await execFileAsync(sofficeCmd, ['--headless', '--convert-to', 'png', '--outdir', tmpDir, tmpFilePath], { timeout: 2 * 60 * 1000 })

//       // Read generated PNG files
//       const files = await fs.promises.readdir(tmpDir)
//       const pngFiles = files.filter((f) => f.toLowerCase().endsWith('.png')).sort()

//       const processedSlides: any[] = []

//       for (let i = 0; i < pngFiles.length; i++) {
//         const pngName = pngFiles[i]
//         const pngPath = path.join(tmpDir, pngName)
//         const pngBuffer = await fs.promises.readFile(pngPath)

//         // Create a slide identifier
//         const slideId = `slide-${i + 1}`

//         // Upload thumbnail and slide content (we'll store thumbnail as content for now)
//         const thumbPath = await gcs.uploadThumbnail(presentationId, slideId, pngBuffer)

//         // Create slide DB record
//         const slideRecord = await db.createSlide({
//           presentation_id: presentationRecord.id,
//           slide_id: slideId,
//           slide_number: i + 1,
//           title: `${title} - Slide ${i + 1}`,
//           content: undefined,
//           speaker_notes: undefined,
//           thumbnail_url: thumbPath,
//           gcs_content_path: undefined,
//           gcs_thumbnail_path: thumbPath,
//         })

//         processedSlides.push({
//           slideId: slideRecord.slide_id,
//           title: slideRecord.title,
//           thumbnailUrl: thumbPath,
//         })
//       }

//       // Update presentation with completed status and correct slide_count
//       await db.updatePresentation(presentationId, {
//         slide_count: pngFiles.length,
//         status: 'completed',
//       })

//       // Store metadata in storage as well
//       await gcs.uploadPresentationMetadata(presentationId, {
//         id: presentationId,
//         title,
//         slideCount: pngFiles.length,
//         storageUrl,
//         slides: processedSlides,
//         importedAt: new Date().toISOString(),
//       })

//       return NextResponse.json({
//         id: presentationId,
//         title,
//         slideCount: pngFiles.length,
//         source: 'pptx',
//         storageUrl,
//       })
//     } catch (convertError) {
//       console.error('Conversion error:', convertError)
//       // Mark presentation as error
//       try {
//         await db.updatePresentation(presentationId, { status: 'error' })
//       } catch (e) {
//         console.error('Failed to update presentation status to error:', e)
//       }
//       return NextResponse.json({ error: 'Failed to convert PPTX to slides', details: String(convertError) }, { status: 500 })
//     } finally {
//       // Clean up temp files
//       try {
//         const cleanupFiles = await fs.promises.readdir(tmpDir)
//         await Promise.all(cleanupFiles.map((f) => fs.promises.unlink(path.join(tmpDir, f))))
//         await fs.promises.rmdir(tmpDir)
//       } catch (cleanupErr) {
//         // ignore
//       }
//     }
//   } catch (error) {
//     console.error("PPTX import error:", error)
//     return NextResponse.json({ error: "Failed to import PowerPoint file" }, { status: 500 })
//   }
// }
