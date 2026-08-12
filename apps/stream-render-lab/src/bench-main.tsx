import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { StandaloneBench } from './bench/standalone-bench'

import './bench-standalone.css'
import './bench-standalone-heavy.css'

createRoot(document.getElementById('bench-root')!).render(
  <StrictMode>
    <StandaloneBench />
  </StrictMode>,
)
