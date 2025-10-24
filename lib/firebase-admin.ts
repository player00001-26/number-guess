import { initializeApp, cert, getApps } from "firebase-admin/app"
import { getDatabase } from "firebase-admin/database"

const firebaseConfig = {
  type: "service_account",
  project_id: process.env.FIREBASE_PROJECT_ID,
  private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID || "key-id",
  private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  client_id: process.env.FIREBASE_CLIENT_ID || "123456789",
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
}

let app: any = null
let db: any = null

try {
  if (!getApps().length) {
    app = initializeApp({
      credential: cert(firebaseConfig as any),
      databaseURL: process.env.FIREBASE_DATABASE_URL || "https://select-number-default-rtdb.firebaseio.com",
    })
    db = getDatabase(app)
  } else {
    app = getApps()[0]
    db = getDatabase(app)
  }
} catch (error) {
  console.error("[v0] Firebase Admin initialization error:", error)
  console.error("[v0] Config:", {
    project_id: process.env.FIREBASE_PROJECT_ID,
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    database_url: process.env.FIREBASE_DATABASE_URL,
  })
}

export { db }

export async function createSession() {
  if (!db) {
    throw new Error("Firebase not initialized - check environment variables")
  }

  const sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  const sessionRef = db.ref(`sessions/${sessionId}`)

  await sessionRef.set({
    id: sessionId,
    createdAt: Date.now(),
    status: "active",
    numbers: {},
    startTime: Date.now(),
  })

  return sessionId
}

export async function getSession(sessionId: string) {
  if (!db) throw new Error("Firebase not initialized")
  const sessionRef = db.ref(`sessions/${sessionId}`)
  const snapshot = await sessionRef.once("value")
  return snapshot.val()
}

export async function updateSession(sessionId: string, updates: any) {
  if (!db) throw new Error("Firebase not initialized")
  const sessionRef = db.ref(`sessions/${sessionId}`)
  await sessionRef.update(updates)
}

export async function deleteSession(sessionId: string) {
  if (!db) throw new Error("Firebase not initialized")
  const sessionRef = db.ref(`sessions/${sessionId}`)
  await sessionRef.remove()
}

export async function getAllSessions() {
  if (!db) throw new Error("Firebase not initialized")
  const sessionsRef = db.ref("sessions")
  const snapshot = await sessionsRef.once("value")
  const sessions = snapshot.val() || {}
  return Object.values(sessions)
}
