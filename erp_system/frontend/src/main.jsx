import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './styles/globals.css'

// Do not let a touchpad scroll or arrow key silently change a quantity.
document.addEventListener('wheel', (event) => {
  if (event.target instanceof HTMLInputElement && event.target.type === 'number') {
    event.preventDefault()
  }
}, { passive: false, capture: true })

document.addEventListener('keydown', (event) => {
  if (
    event.target instanceof HTMLInputElement &&
    event.target.type === 'number' &&
    (event.key === 'ArrowUp' || event.key === 'ArrowDown')
  ) {
    event.preventDefault()
  }
}, true)


createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
