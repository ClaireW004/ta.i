import { NextResponse } from "next/server"
import { db } from "@/lib/database"

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    const presentation = await db.getPresentation(id)
    if (!presentation) return NextResponse.json({ error: "Not found" }, { status: 404 })
    return NextResponse.json(presentation)
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed to fetch presentation' }, { status: 500 })
  }
}
