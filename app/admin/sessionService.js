// sessionService.js
import { getDatabase, ref, push, onValue, remove } from "firebase/database"
import { initializeApp } from "firebase/app"

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
}

const app = initializeApp(firebaseConfig)
const db = getDatabase(app)

// Add a new session
export const addSession = async (sessionData) => {
  const sessionsRef = ref(db, "sessions")
  await push(sessionsRef, sessionData)
}

// Listen for all sessions (live updates)
export const listenAllSessions = (callback) => {
  const sessionsRef = ref(db, "sessions")
  onValue(sessionsRef, (snapshot) => {
    const data = snapshot.val() || {}
    const sessions = Object.entries(data).map(([id, value]) => ({
      id,
      ...value,
    }))
    callback(sessions)
  })
}

// Delete a session by ID
export const deleteSession = async (sessionId) => {
  const sessionRef = ref(db, `sessions/${sessionId}`)
  await remove(sessionRef)
}
