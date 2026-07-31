import { Outlet, Link, useLocation } from 'react-router-dom'
import { LayoutDashboard, Package, ShoppingCart, FileText, LogOut, Star } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'

export default function AppLayout() {
  const { signOut } = useAuth()
  const location = useLocation()

  const navItems = [
    { name: 'Checkout', path: '/checkout', icon: ShoppingCart },
    { name: 'Inventory', path: '/inventory', icon: Package },
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Statements', path: '/statements', icon: FileText },
  ]

  return (
    <div className="h-[100dvh] bg-stone-50 font-sans flex flex-col max-w-md mx-auto relative shadow-2xl overflow-hidden">
      {/* Header */}
      <header className="bg-gradient-to-r from-amber-700 to-amber-500 px-4 pt-6 pb-4 shadow-lg shrink-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 rounded-xl p-2">
              <Star size={22} className="text-white" fill="white"/>
            </div>
            <div>
              <h1 className="text-white font-bold text-lg leading-tight">Quba Dates</h1>
              <p className="text-amber-100 text-xs">Inventory & Checkout System</p>
            </div>
          </div>
          <button onClick={signOut} className="text-amber-100 hover:text-white transition-colors bg-white/10 p-2 rounded-xl">
            <LogOut size={20} />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pb-6 relative z-0">
        <Outlet />
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="shrink-0 bg-white border-t border-stone-200 flex justify-around items-center px-2 py-2 z-40 pb-safe shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = location.pathname === item.path
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex-1 flex flex-col items-center justify-center py-2 min-w-[64px] transition-all ${
                isActive 
                  ? 'text-amber-700 border-t-2 border-amber-600 -mt-[2px]' 
                  : 'text-stone-400 hover:text-stone-600 border-t-2 border-transparent -mt-[2px]'
              }`}
            >
              <Icon size={20} className={isActive ? 'mb-1' : 'mb-1 opacity-80'} />
              <span className="text-[10px] font-semibold">{item.name}</span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
