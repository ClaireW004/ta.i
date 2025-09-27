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