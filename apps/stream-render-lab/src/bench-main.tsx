import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { StandaloneBench } from './bench/standalone-bench'

import './bench-standalone.css'

createRoot(document.getElementById('bench-root')!).render(
  <StrictMode>
    <StandaloneBench />
  </StrictMode>,
)
