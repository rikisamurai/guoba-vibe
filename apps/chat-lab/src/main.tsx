import './styles.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { App } from './app'
import { initChatPersistence } from './store/persistence'
import { initSettingsPersistence } from './store/settings-store'

initSettingsPersistence(localStorage)
initChatPersistence(localStorage)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
