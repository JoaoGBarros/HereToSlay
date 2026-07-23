import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/grenze/500.css'
import '@fontsource/grenze/700.css'
import '@fontsource/grenze/800.css'
import '@fontsource/nunito/400.css'
import '@fontsource/nunito/600.css'
import '@fontsource/nunito/700.css'
import '@fontsource/nunito/800.css'
import './index.css'
import './styles/tokens.css'
import App from './App.tsx'
import { WebSocketProvider } from '@/utils/WebSocketProvider.tsx'
import { applyMotionPref } from '@/utils/motion'
import { I18nProvider } from '@/i18n'

applyMotionPref()


createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <I18nProvider>
      <WebSocketProvider>
        <App />
      </WebSocketProvider>
    </I18nProvider>
  </StrictMode>,
)
