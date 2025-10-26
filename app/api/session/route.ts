import { NextResponse } from "next/server"
import { getDatabase } from "firebase-admin/database"
import { initializeApp, cert, getApps } from "firebase-admin/app"

const firebaseConfig = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  databaseURL: process.env.FIREBASE_DATABASE_URL,
}

if (!getApps().length) {
  initializeApp({
    credential: cert(firebaseConfig as any),
    databaseURL: firebaseConfig.databaseURL,
  })
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const sessionId = searchParams.get("id")
    if (!sessionId)
      return NextResponse.json({ error: "Missing session ID" }, { status: 400 })

    const db = getDatabase()
    const snapshot = await db.ref(sessions/${sessionId}).once("value")
    return NextResponse.json(snapshot.val() || {})
  } catch (error) {
    console.error("Error fetching session:", error)
    return NextResponse.json({ error: "Failed to fetch session" }, { status: 500 })
  }
}
