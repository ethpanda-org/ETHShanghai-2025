import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import AppWithBlocks from './App-with-blocks'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppWithBlocks />
  </StrictMode>,
)
