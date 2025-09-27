import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { DatabaseService } from "@/lib/database"

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check for authentication errors
    if (session.error) {
      console.log("🔄 Session has auth error:", session.error)
      return NextResponse.json({ 
        error: "Authentication error", 
        details: session.error 
      }, { status: 401 })
    }

    const db = new DatabaseService()
    
    // Get user's presentations
    const presentations = await db.getUserPresentations(session.user.email)
    
    return NextResponse.json({
      success: true,
      presentations,
    })
  } catch (error) {
    console.error("Error fetching presentations:", error)
    return NextResponse.json(
      { error: "Failed to fetch presentations" },
      { status: 500 }
    )
  }
}