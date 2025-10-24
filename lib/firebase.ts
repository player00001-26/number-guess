import { initializeApp } from "firebase/app"
import { getDatabase, ref, set, get, remove, onValue, update } from "firebase/database"

const firebaseConfig = {
  apiKey: "AIzaSyDqsN0P4A_Qsd5Dp8sGPRYane9PDa3fpuw",
  authDomain: "select-number.firebaseapp.com",
  databaseURL: "https://select-number-default-rtdb.firebaseio.com",
  projectId: "select-number",
  storageBucket: "select-number.firebasestorage.app",
  messagingSenderId: "34951713457",
  appId: "1:34951713457:web:acb853d4a10d72fe5f0890",
  measurementId: "G-Y22VQNMC87",
}

const app = initializeApp(firebaseConfig)
export const database = getDatabase(app)

export async function createSession() {
  const sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  const sessionRef = ref(database, `sessions/${sessionId}`)

  await set(sessionRef, {
    id: sessionId,
    createdAt: Date.now(),
    status: "active",
    numbers: {},
    startTime: Date.now(),
  })

  return sessionId
}

export async function getSession(sessionId: string) {
  const sessionRef = ref(database, `sessions/${sessionId}`)
  const snapshot = await get(sessionRef)
  return snapshot.val()
}

export async function updateSession(sessionId: string, updates: any) {
  const sessionRef = ref(database, `sessions/${sessionId}`)
  await update(sessionRef, updates)
}

export async function deleteSession(sessionId: string) {
  const sessionRef = ref(database, `sessions/${sessionId}`)
  await remove(sessionRef)
}

export async function getAllSessions() {
  const sessionsRef = ref(database, "sessions")
  const snapshot = await get(sessionsRef)
  const sessions = snapshot.val() || {}
  return Object.values(sessions)
}

export function onSessionChange(sessionId: string, callback: (session: any) => void) {
  const sessionRef = ref(database, `sessions/${sessionId}`)
  return onValue(sessionRef, (snapshot) => {
    callback(snapshot.val())
  })
}

export function onAllSessionsChange(callback: (sessions: any[]) => void) {
  const sessionsRef = ref(database, "sessions")
  return onValue(sessionsRef, (snapshot) => {
    const sessions = snapshot.val() || {}
    callback(Object.values(sessions))
  })
}
