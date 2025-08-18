import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

import { AppProvider } from "./context/AppContext";
import { SettingsProvider } from "./context/SettingsContext";

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProvider>
      <SettingsProvider>
        <App />
      </SettingsProvider>
    </AppProvider>
  </StrictMode>,
)
