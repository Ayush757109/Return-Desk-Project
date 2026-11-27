import { NavLink, Outlet, Link } from 'react-router-dom'
import { Home, Inbox, PlusCircle, BookOpenText, Undo2 } from 'lucide-react'

const NAV = [
  { to: '/', label: 'Home', icon: Home, end: true },
  { to: '/queue', label: 'Returns queue', icon: Inbox, end: false },
  { to: '/new', label: 'New request', icon: PlusCircle, end: false },
  { to: '/docs', label: 'Docs & API', icon: BookOpenText, end: false },
]

function navClass({ isActive }: { isActive: boolean }) {
  return `flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
    isActive ? 'bg-teal-700 text-white' : 'text-stone-600 hover:bg-stone-200/70 hover:text-stone-900'
  }`
}

export default function Layout() {
  return (
    <div className="min-h-dvh lg:flex">
      {/* Sidebar (desktop) */}
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-stone-200 bg-[#f3f1ec] px-4 py-6 lg:flex">
        <Link to="/" className="flex items-center gap-2.5 px-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-700 text-white">
            <Undo2 className="h-5 w-5" aria-hidden="true" />
          </span>
          <span>
            <span className="block font-display text-lg font-bold leading-tight text-stone-900">ReturnDesk</span>
            <span className="block text-[11px] font-medium uppercase tracking-wider text-stone-500">Store returns desk</span>
          </span>
        </Link>
        <nav className="mt-8 flex flex-col gap-1" aria-label="Main">
          {NAV.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className={navClass}>
              <item.icon className="h-4.5 w-4.5 shrink-0" aria-hidden="true" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <p className="mt-auto px-2 text-xs leading-relaxed text-stone-500">
          PostgreSQL-backed. Every business rule is enforced on the server — the UI only offers actions that are legal right now.
        </p>
      </aside>

      {/* Top bar (mobile / tablet) */}
      <header className="sticky top-0 z-40 border-b border-stone-200 bg-[#f3f1ec]/95 backdrop-blur lg:hidden">
        <div className="flex items-center gap-2.5 px-4 py-3">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-700 text-white">
              <Undo2 className="h-4.5 w-4.5" aria-hidden="true" />
            </span>
            <span className="font-display text-lg font-bold text-stone-900">ReturnDesk</span>
          </Link>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-2.5" aria-label="Main">
          {NAV.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className={(state) => `${navClass(state)} shrink-0`}>
              <item.icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </header>

      <main className="min-w-0 flex-1">
        <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:py-8">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
