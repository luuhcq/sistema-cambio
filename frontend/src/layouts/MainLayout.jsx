import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useSolicitacoes } from '../hooks/useSolicitacoes'
import TrocarSenhaModal from '../components/TrocarSenhaModal'

export default function MainLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const { data: solicitacoes } = useSolicitacoes()
  const pendentes = solicitacoes?.filter((s) => s.status === 'PENDENTE')?.length || 0

  const isGestor = user?.perfil === 'Gestor'

  const links = [
    { to: '/', label: 'Dashboard' },
    { to: '/boletas', label: 'Boletas' },
    { to: '/clientes', label: 'Clientes' },
    { to: '/solicitacoes', label: isGestor ? 'Solicitações' : 'Minhas Solicitações', badge: pendentes },
    ...(isGestor ? [{ to: '/usuarios', label: 'Usuários' }] : []),
    ...(isGestor ? [{ to: '/configuracoes', label: 'Configurações' }] : []),
  ]

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="h-screen flex bg-gray-50 dark:bg-gray-950 overflow-hidden">
      <aside className="w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col">
        <div className="p-6 border-b border-gray-200 dark:border-gray-800">
          <h1 className="text-lg font-bold text-gray-900 dark:text-white">
            Sistema de Câmbio
          </h1>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === '/'}
              className={({ isActive }) =>
                `flex items-center justify-between px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                    : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
                }`
              }
            >
              {link.label}
              {link.badge > 0 && (
                <span className="px-1.5 py-0.5 bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 rounded-full text-xs font-medium">
                  {link.badge}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-200 dark:border-gray-800">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
            {user?.first_name || user?.username}
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-2">
            {user?.perfil || 'Sem perfil'}
          </p>
          <button
            onClick={handleLogout}
            className="text-sm text-red-600 hover:text-red-800 dark:text-red-400"
          >
            Sair
          </button>
        </div>
      </aside>

      <main className="flex-1 p-8 overflow-auto">
        <Outlet />
      </main>

      {user?.deve_trocar_senha && <TrocarSenhaModal />}
    </div>
  )
}
