import { Link, useLocation } from '@rspress/core/runtime'

import { LabLink } from '../components/lab-link'

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
      <LabLink path="/playground">Playground</LabLink>
      <LabLink path="/project">Mini Chat</LabLink>
      <LabLink path="/lab">进阶实验台</LabLink>
    </nav>
  )
}
