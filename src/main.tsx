import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './App.css'
import App from './App.tsx'
import RefBar from './RefBar.tsx'
import PropsPage from './PropsPage.tsx'

// One bundle, three pages: the main window, and the tab bar / Properties tab of the references window
const hash = location.hash
const Page = hash.startsWith('#refbar') ? RefBar : hash.startsWith('#props') ? PropsPage : App

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Page />
  </StrictMode>,
)
