import { Link, useLocation } from '@rspress/core/runtime'

const labOrigin = import.meta.env.PUBLIC_LAB_ORIGIN ?? 'http://localhost:5174'

export function CourseBrand() {
  return (
    <Link className="sr-brand" to="/" aria-label="Streaming Render Course 首页">
      <span className="sr-brand__mark" aria-hidden="true">
        SR
      </span>
      <span>
        <strong>Streaming Render</strong>
        <small>COURSE / LAB</small>
      </span>
    </Link>
  )
}

export function ProductNav() {
  const { pathname } = useLocation()

  return (
    <nav className="sr-product-nav" aria-label="产品导航">
      <Link className={pathname === '/' ? 'is-active' : ''} to="/">
        课程
      </Link>
      <a href={`${labOrigin}/playground`}>Playground</a>
      <a href={`${labOrigin}/project`}>Mini Chat</a>
      <a href={`${labOrigin}/lab`}>进阶实验台</a>
    </nav>
  )
}
