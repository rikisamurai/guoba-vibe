import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { App } from './app'

import './styles/base.css'
import './styles/workspace.css'
import './styles/editor.css'
import './styles/matrix.css'
import './styles/responsive.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
