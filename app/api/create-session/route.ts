import { NextResponse } from "next/server"
import { initializeApp, cert, getApps } from "firebase-admin/app"
import { getDatabase } from "firebase-admin/database"

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

export async function POST(req: Request) {
  try {
    const db = getDatabase()
    const body = await req.json()
    const sessionRef = db.ref("sessions").push()
    await sessionRef.set({
      createdAt: Date.now(),
      ...body,
    })
    return NextResponse.json({ id: sessionRef.key, success: true })
  } catch (error) {
    console.error("Error creating session:", error)
    return NextResponse.json({ error: "Failed to create session" }, { status: 500 })
  }
}
