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
    <div className="h-[100dvh] bg-stone-50 font-sans flex flex-col md:flex-row w-full relative overflow-hidden">
      
      {/* Desktop Sidebar (hidden on mobile) */}
      <aside className="hidden md:flex flex-col w-64 bg-gradient-to-b from-amber-800 to-amber-600 shadow-2xl shrink-0 z-20">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-10">
            <div className="bg-white/20 rounded-xl p-2.5">
              <Star size={24} className="text-white" fill="white"/>
            </div>
            <div>
              <h1 className="text-white font-bold text-xl leading-tight">Quba Dates</h1>
              <p className="text-amber-100 text-[10px] uppercase tracking-wider font-bold mt-1">POS System</p>
            </div>
          </div>
          
          <nav className="space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = location.pathname === item.path
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all ${
                    isActive 
                      ? 'bg-white/20 text-white font-bold shadow-sm' 
                      : 'text-amber-100/80 hover:bg-white/10 hover:text-white font-medium'
                  }`}
                >
                  <Icon size={20} className={isActive ? 'opacity-100' : 'opacity-80'} />
                  <span className="text-sm">{item.name}</span>
                </Link>
              )
            })}
          </nav>
        </div>
        
        <div className="mt-auto p-6">
          <button onClick={signOut} className="w-full flex items-center justify-center gap-2 bg-black/20 hover:bg-black/30 text-white py-3.5 rounded-xl transition-colors text-sm font-bold shadow-sm">
            <LogOut size={18} /> Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile Header (hidden on desktop) */}
      <header className="md:hidden bg-gradient-to-r from-amber-700 to-amber-500 px-4 pt-6 pb-4 shadow-lg shrink-0 z-10">
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
      <main className="flex-1 overflow-y-auto relative z-0 md:p-6 lg:p-8 custom-scrollbar">
        <div className="max-w-7xl mx-auto h-full">
          <Outlet />
        </div>
      </main>

      {/* Mobile Bottom Navigation (hidden on desktop) */}
      <nav className="md:hidden shrink-0 bg-white border-t border-stone-200 flex justify-around items-center px-2 py-2 z-40 pb-safe shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
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
