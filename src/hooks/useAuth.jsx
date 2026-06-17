import { createContext, useContext, useEffect, useState } from 'react'
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth'
import {
  doc,
  setDoc,
  getDoc,
  serverTimestamp,
} from 'firebase/firestore'
import { auth, db } from '../lib/firebase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]         = useState(null)
  const [profile, setProfile]   = useState(null)  // { groupId, displayName, ... }
  const [loading, setLoading]   = useState(true)

  /* Fetch profile from Firestore whenever auth user changes */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser)
      if (firebaseUser) {
        const snap = await getDoc(doc(db, 'users', firebaseUser.uid))
        setProfile(snap.exists() ? snap.data() : null)
      } else {
        setProfile(null)
      }
      setLoading(false)
    })
    return unsub
  }, [])

  /* ── Sign Up ──────────────────────────────────────────────────────── */
  async function signUp(email, password, displayName, inviteGroupId = null) {
    const cred = await createUserWithEmailAndPassword(auth, email, password)
    const uid  = cred.user.uid

    // Reuse existing groupId from invite link, or create a new one
    const groupId = inviteGroupId || uid   // use first user's uid as group key

    await setDoc(doc(db, 'users', uid), {
      uid,
      email,
      displayName,
      groupId,
      createdAt: serverTimestamp(),
    })

    // Upsert the group document (idempotent)
    await setDoc(
      doc(db, 'groups', groupId),
      { members: { [uid]: displayName }, updatedAt: serverTimestamp() },
      { merge: true }
    )

    setProfile({ uid, email, displayName, groupId })
    return { uid, groupId }
  }

  /* ── Sign In ──────────────────────────────────────────────────────── */
  async function signIn(email, password) {
    const cred = await signInWithEmailAndPassword(auth, email, password)
    const snap = await getDoc(doc(db, 'users', cred.user.uid))
    setProfile(snap.data())
  }

  /* ── Sign Out ─────────────────────────────────────────────────────── */
  async function logOut() {
    await signOut(auth)
    setProfile(null)
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, signUp, signIn, logOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
