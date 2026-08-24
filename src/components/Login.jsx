import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { user, signInWithGoogle, joinWithCode, error } = useAuth()
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // El nombre por defecto es el de la cuenta de Google, pero se puede editar.
  useEffect(() => {
    if (user?.displayName) setName(user.displayName)
  }, [user])

  async function handleGoogleClick() {
    setSubmitting(true)
    try {
      await signInWithGoogle()
    } catch {
      // el error ya queda expuesto via el contexto
    } finally {
      setSubmitting(false)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    try {
      await joinWithCode(name, code)
    } catch {
      // el error ya queda expuesto via el contexto
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="login-screen">
      <div className="login-card">
        <h1>La Porra</h1>

        {!user ? (
          <>
            <p>Inicia sesión con Google para entrar.</p>
            <button onClick={handleGoogleClick} disabled={submitting}>
              {submitting ? 'Conectando...' : 'Entrar con Google'}
            </button>
          </>
        ) : (
          <>
            <p>
              Sesión iniciada como {user.email}. Introduce el código de invitación para unirte a la
              porra.
            </p>
            <form onSubmit={handleSubmit}>
              <label>
                Nombre
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={40}
                  required
                />
              </label>
              <label>
                Código de invitación
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  autoComplete="off"
                  autoCapitalize="off"
                  autoCorrect="off"
                  spellCheck="false"
                  required
                />
              </label>
              <button type="submit" disabled={submitting}>
                {submitting ? 'Entrando...' : 'Entrar'}
              </button>
            </form>
          </>
        )}

        {error && <p className="error">{error}</p>}
      </div>
    </div>
  )
}
