import { NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Header() {
  const { player, logout } = useAuth()

  return (
    <header className="app-header">
      <div className="app-header__brand">La Porra</div>
      <nav>
        <NavLink to="/" end>
          Partidos
        </NavLink>
        <NavLink to="/ranking">Clasificación</NavLink>
        <NavLink to="/bote">Bote</NavLink>
        {player?.isAdmin && <NavLink to="/admin">Admin</NavLink>}
      </nav>
      <div className="app-header__player">
        {player?.name}
        {player?.isAdmin && <span className="badge">admin</span>}
        <button className="logout-btn" onClick={logout}>
          Salir
        </button>
      </div>
    </header>
  )
}
