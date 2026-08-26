import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Login from './components/Login'
import Header from './components/Header'
import MatchesPage from './pages/MatchesPage'
import RankingPage from './pages/RankingPage'
import PoolPage from './pages/PoolPage'
import AdminPage from './pages/AdminPage'

export default function App() {
  const { user, player, loading } = useAuth()

  if (loading) {
    return <div className="loading-screen">Cargando...</div>
  }

  if (!user || !player) {
    return <Login />
  }

  return (
    <BrowserRouter>
      <Header />
      <main>
        <Routes>
          <Route path="/" element={<MatchesPage />} />
          <Route path="/ranking" element={<RankingPage />} />
          <Route path="/bote" element={<PoolPage />} />
          <Route
            path="/admin"
            element={player.isAdmin ? <AdminPage /> : <Navigate to="/" replace />}
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </BrowserRouter>
  )
}
