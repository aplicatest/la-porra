import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth'
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'
import { auth, db } from '../firebase'

const googleProvider = new GoogleAuthProvider()

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [player, setPlayer] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    return onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser)
      if (firebaseUser) {
        const snap = await getDoc(doc(db, 'players', firebaseUser.uid))
        setPlayer(snap.exists() ? { uid: firebaseUser.uid, ...snap.data() } : null)
      } else {
        setPlayer(null)
      }
      setLoading(false)
    })
  }, [])

  const signInWithGoogle = useCallback(async () => {
    setError(null)
    try {
      await signInWithPopup(auth, googleProvider)
    } catch (err) {
      setError('No se pudo iniciar sesión con Google.')
      throw err
    }
  }, [])

  const joinWithCode = useCallback(async (name, code) => {
    setError(null)
    const trimmedName = name.trim()
    const trimmedCode = code.trim()
    if (!auth.currentUser) {
      setError('Inicia sesión con Google primero.')
      return
    }
    if (!trimmedName || !trimmedCode) {
      setError('Introduce tu nombre y el código de invitación.')
      return
    }

    try {
      const playerRef = doc(db, 'players', auth.currentUser.uid)
      const baseData = {
        name: trimmedName,
        code: trimmedCode,
        createdAt: serverTimestamp(),
      }

      // El cliente no sabe si el codigo es el de jugador o el de admin (eso
      // solo lo valida la regla de seguridad contra config/app), asi que se
      // prueba primero como jugador normal y, si la regla lo rechaza, como
      // admin. Si ninguno de los dos encaja, el codigo es sencillamente
      // incorrecto.
      try {
        await setDoc(playerRef, { ...baseData, isAdmin: false })
      } catch (playerErr) {
        console.warn('Fallo como jugador normal, se prueba como admin:', playerErr.code, playerErr.message)
        await setDoc(playerRef, { ...baseData, isAdmin: true })
      }

      const snap = await getDoc(playerRef)
      setPlayer({ uid: auth.currentUser.uid, ...snap.data() })
    } catch (err) {
      console.error('joinWithCode ha fallado:', err.code, err.message)
      setError('Código de invitación incorrecto.')
      throw err
    }
  }, [])

  const logout = useCallback(() => signOut(auth), [])

  return (
    <AuthContext.Provider value={{ user, player, loading, error, signInWithGoogle, joinWithCode, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
