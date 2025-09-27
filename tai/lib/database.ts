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
