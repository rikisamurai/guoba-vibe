import { NavLink, Outlet, useLocation } from 'react-router-dom'

const NAV_ITEMS = [
  { label: '实验台', to: '/lab' },
  { label: '性能分析', to: '/profiler' },
  { label: '真实聊天', to: '/chat' },
]

export function SiteShell() {
  const location = useLocation()
  const status = location.pathname.startsWith('/chat')
    ? 'LIVE SOURCE'
    : location.pathname.startsWith('/profiler')
      ? 'PROFILER IDLE'
      : 'DETERMINISTIC'
  const courseOrigin = import.meta.env.VITE_COURSE_ORIGIN ?? 'http://localhost:5173'
  return (
    <div className="site-shell">
      <a className="skip-link" href="#main-content">
        跳到主要内容
      </a>
      <header className="site-header">
        <NavLink className="brand" to="/lab" aria-label="Streaming Render Lab 首页">
          <span className="brand__stamp" aria-hidden="true">
            SR
          </span>
          <span>
            <strong>Streaming Render</strong>
            <small>WORKBENCH · REACT 19</small>
          </span>
        </NavLink>
        <nav className="site-nav" aria-label="主导航">
          <a className="site-nav__link" href={courseOrigin}>
            课程
          </a>
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                isActive ? 'site-nav__link is-active' : 'site-nav__link'
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="header-actions">
          <span className="header-status">
            <i />
            {status}
          </span>
          <NavLink className="header-bench" to="/bench">
            BENCH
          </NavLink>
        </div>
      </header>
      <main id="main-content">
        <Outlet />
      </main>
      <footer className="site-footer">
        <p>从字节边界到 React commit，每个结论都应能重放。</p>
        <NavLink to="/repro/broken-fence">打开故障档案 →</NavLink>
      </footer>
    </div>
  )
}
