import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import AppSwitch from './AppSwitch.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AppSwitch />
  </StrictMode>,
)
