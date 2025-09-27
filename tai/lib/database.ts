<<<<<<< HEAD
import { Pool } from "pg"
import fs from "fs"
import path from "path"

const DATABASE_URL = process.env.DATABASE_URL
const STORAGE_DIR = path.resolve(process.cwd(), "./.storage")
const DB_FILE = path.join(STORAGE_DIR, "db.json")

if (!fs.existsSync(STORAGE_DIR)) fs.mkdirSync(STORAGE_DIR, { recursive: true })
if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, JSON.stringify({ presentations: {} }, null, 2))

let pool: Pool | null = null
if (DATABASE_URL) {
  pool = new Pool({ connectionString: DATABASE_URL })
}

const readStore = async () => {
  const txt = await fs.promises.readFile(DB_FILE, "utf-8")
  return JSON.parse(txt)
}

const writeStore = async (data: any) => {
  await fs.promises.writeFile(DB_FILE, JSON.stringify(data, null, 2), "utf-8")
}

export const db = {
  async getPresentation(id: string) {
    if (pool) {
      const res = await pool.query('SELECT * FROM presentations WHERE presentation_id = $1', [id])
      return res.rows[0]
    }

    const store = await readStore()
    return store.presentations?.[id] ?? null
  },

  async createPresentation(data: {
    presentation_id: string
    title: string
    source_type: string
    source_url?: string
    slide_count?: number
    created_by?: string
    gcs_bucket?: string
    locale?: string
    status?: string
  }) {
    if (pool) {
      const {
        presentation_id,
        title,
        source_type,
        source_url,
        slide_count,
        created_by,
        gcs_bucket,
        locale,
        status,
      } = data
      const sql = `
        INSERT INTO presentations (presentation_id, title, source_type, source_url, slide_count, created_by, gcs_bucket, locale, status, created_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,now())
        RETURNING *
      `
      const res = await pool.query(sql, [
        presentation_id,
        title,
        source_type,
        source_url || null,
        slide_count || null,
        created_by || null,
        gcs_bucket || null,
        locale || null,
        status || 'processing',
      ])
      return res.rows[0]
    }

    const store = await readStore()
    store.presentations = store.presentations || {}
    const rec = {
      presentation_id: data.presentation_id,
      title: data.title,
      source_type: data.source_type,
      source_url: data.source_url || null,
      slide_count: data.slide_count ?? null,
      created_by: data.created_by || null,
      gcs_bucket: data.gcs_bucket || null,
      locale: data.locale || null,
      status: data.status || 'processing',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    store.presentations[data.presentation_id] = rec
    await writeStore(store)
    return rec
  },

  async updatePresentation(presentationId: string, fields: Record<string, any>) {
    if (pool) {
      const setClauses: string[] = []
      const values: any[] = []
      let idx = 1
      for (const [k, v] of Object.entries(fields)) {
        setClauses.push(`${k} = $${idx}`)
        values.push(v)
        idx++
      }
      values.push(presentationId)
      const sql = `UPDATE presentations SET ${setClauses.join(", ")}, updated_at = now() WHERE presentation_id = $${idx} RETURNING *`
      const res = await pool.query(sql, values)
      return res.rows[0]
    }

    const store = await readStore()
    const rec = store.presentations?.[presentationId]
    if (!rec) return null
    for (const [k, v] of Object.entries(fields)) {
      rec[k] = v
    }
    rec.updated_at = new Date().toISOString()
    store.presentations[presentationId] = rec
    await writeStore(store)
    return rec
  },
}
=======
import { Pool } from 'pg'

// Create a connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
})

export interface PresentationRecord {
  id: number
  presentation_id: string
  title: string
  source_type: string
  source_url?: string
  slide_count: number
  created_at: Date
  updated_at: Date
  created_by?: string
  thumbnail_url?: string
  locale?: string
  gcs_bucket?: string
  status: string
}

export interface SlideRecord {
  id: number
  presentation_id: number
  slide_id: string
  slide_number: number
  title?: string
  content?: string
  speaker_notes?: string
  thumbnail_url?: string
  gcs_content_path?: string
  gcs_thumbnail_path?: string
  created_at: Date
  updated_at: Date
}

export interface SlideElementRecord {
  id: number
  slide_id: number
  element_type: string
  content: string
  position_x?: number
  position_y?: number
  width?: number
  height?: number
  element_order: number
  created_at: Date
}

export class DatabaseService {
  async createPresentation(data: Omit<PresentationRecord, 'id' | 'created_at' | 'updated_at'>): Promise<PresentationRecord> {
    const query = `
      INSERT INTO presentations (
        presentation_id, title, source_type, source_url, slide_count, 
        created_by, thumbnail_url, locale, gcs_bucket, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `
    
    const values = [
      data.presentation_id,
      data.title,
      data.source_type,
      data.source_url,
      data.slide_count,
      data.created_by,
      data.thumbnail_url,
      data.locale,
      data.gcs_bucket,
      data.status,
    ]
    
    const result = await pool.query(query, values)
    return result.rows[0]
  }

  async updatePresentation(presentationId: string, data: Partial<PresentationRecord>): Promise<PresentationRecord> {
    const updates = Object.keys(data)
      .filter(key => key !== 'id' && key !== 'created_at')
      .map((key, index) => `${key} = $${index + 2}`)
      .join(', ')
    
    const query = `
      UPDATE presentations 
      SET ${updates}, updated_at = CURRENT_TIMESTAMP
      WHERE presentation_id = $1
      RETURNING *
    `
    
    const values = [presentationId, ...Object.values(data).filter((_, index) => 
      Object.keys(data)[index] !== 'id' && Object.keys(data)[index] !== 'created_at'
    )]
    
    const result = await pool.query(query, values)
    return result.rows[0]
  }

  async getPresentation(presentationId: string): Promise<PresentationRecord | null> {
    const query = 'SELECT * FROM presentations WHERE presentation_id = $1'
    const result = await pool.query(query, [presentationId])
    return result.rows[0] || null
  }

  async getUserPresentations(userEmail: string): Promise<PresentationRecord[]> {
    const query = `
      SELECT * FROM presentations 
      WHERE created_by = $1 
      ORDER BY updated_at DESC
    `
    const result = await pool.query(query, [userEmail])
    return result.rows
  }

  async createSlide(data: Omit<SlideRecord, 'id' | 'created_at' | 'updated_at'>): Promise<SlideRecord> {
    const query = `
      INSERT INTO slides (
        presentation_id, slide_id, slide_number, title, content, 
        speaker_notes, thumbnail_url, gcs_content_path, gcs_thumbnail_path
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `
    
    const values = [
      data.presentation_id,
      data.slide_id,
      data.slide_number,
      data.title,
      data.content,
      data.speaker_notes,
      data.thumbnail_url,
      data.gcs_content_path,
      data.gcs_thumbnail_path,
    ]
    
    const result = await pool.query(query, values)
    return result.rows[0]
  }

  async createSlideElement(data: Omit<SlideElementRecord, 'id' | 'created_at'>): Promise<SlideElementRecord> {
    const query = `
      INSERT INTO slide_elements (
        slide_id, element_type, content, position_x, position_y, 
        width, height, element_order
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `
    
    const values = [
      data.slide_id,
      data.element_type,
      data.content,
      data.position_x,
      data.position_y,
      data.width,
      data.height,
      data.element_order,
    ]
    
    const result = await pool.query(query, values)
    return result.rows[0]
  }

  async getPresentationSlides(presentationId: string): Promise<SlideRecord[]> {
    const query = `
      SELECT s.* FROM slides s
      JOIN presentations p ON s.presentation_id = p.id
      WHERE p.presentation_id = $1
      ORDER BY s.slide_number
    `
    const result = await pool.query(query, [presentationId])
    return result.rows
  }

  async getSlideElements(slideId: number): Promise<SlideElementRecord[]> {
    const query = `
      SELECT * FROM slide_elements 
      WHERE slide_id = $1 
      ORDER BY element_order
    `
    const result = await pool.query(query, [slideId])
    return result.rows
  }

  async cleanup() {
    await pool.end()
  }
}

export const db = new DatabaseService()
>>>>>>> origin/alex-front-end
