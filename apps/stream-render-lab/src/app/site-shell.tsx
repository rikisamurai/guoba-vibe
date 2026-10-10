import { NavLink, Outlet } from 'react-router-dom'

const NAV_ITEMS = [
  { label: '课程', to: '/learn/quick-start' },
  { label: '实验台', to: '/lab' },
  { label: '性能分析', to: '/profiler' },
  { label: '真实聊天', to: '/chat' },
]

export function SiteShell() {
  return (
    <div className="site-shell">
      <a className="skip-link" href="#main-content">
        跳到主要内容
      </a>
      <header className="site-header">
        <NavLink className="brand" to="/" aria-label="Streaming Render Lab 首页">
          <span className="brand__stamp" aria-hidden="true">
            SR
          </span>
          <span>
            <strong>Streaming Render Lab</strong>
            <small>FIELD NOTES · REACT 19</small>
          </span>
        </NavLink>
        <nav className="site-nav" aria-label="主导航">
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
        <NavLink className="header-bench" to="/bench">
          BENCH 01
        </NavLink>
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
