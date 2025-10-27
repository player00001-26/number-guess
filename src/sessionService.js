import { db, ensureAuth } from "./firebaseConfig"
import { ref, set, get, onValue, remove, push } from "firebase/database"

export async function createSession(data) {
  await ensureAuth()
  const newRef = push(ref(db, "sessions"))
  await set(newRef, {
    ...data,
    createdAt: Date.now(),
  })
  return newRef.key
}

export async function listenAllSessions(callback) {
  await ensureAuth()
  const sessionsRef = ref(db, "sessions")
  const unsub = onValue(sessionsRef, (snap) => {
    callback(snap.val() || {})
  })
  return () => unsub()
}

export async function deleteSession(id) {
  await ensureAuth()
  await remove(ref(db, `sessions/${id}`))
}
