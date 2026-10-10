import '@fontsource-variable/manrope/index.css'
import '@fontsource/ibm-plex-mono/400.css'
import './styles/base.css'
import './styles/sidebar.css'
import './styles/columns.css'
import './styles/skill-list.css'
import './styles/inspector.css'
import './styles/markdown.css'
import './styles/source-details.css'
import './styles/feedback.css'
import './styles/dialog-shell.css'
import './styles/diff-dialog.css'
import './styles/install-dialog.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { App } from './App'

createRoot(document.querySelector('#root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
