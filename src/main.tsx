
import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx';
import './index.css';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ToastProvider } from './context/ToastContext';
import { isNative } from './lib/platform';
import { initOtaUpdates } from './lib/capgo';

if (!isNative()) {
  // PWA service worker — solo en web
  import('virtual:pwa-register').then(({ registerSW }) => {
    const updateSW = registerSW({
      immediate: true,
      onNeedRefresh() {
        const banner = document.createElement('div');
        banner.id = 'sw-update-banner';
        banner.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);z-index:9999;background:#4f46e5;color:#fff;padding:10px 20px;border-radius:12px;font-size:13px;font-weight:600;box-shadow:0 4px 20px rgba(0,0,0,.15);display:flex;align-items:center;gap:10px;font-family:system-ui';
        banner.innerHTML = '<span>Nueva version disponible</span><button style="background:#fff;color:#4f46e5;border:none;padding:4px 12px;border-radius:8px;font-weight:700;cursor:pointer;font-size:12px">Actualizar</button>';
        banner.querySelector('button')!.onclick = () => updateSW(true);
        document.body.appendChild(banner);
      },
    });
  });
} else {
  // En nativo: desregistrar SW si quedó cacheado y arrancar OTA
  navigator.serviceWorker?.getRegistrations().then(regs =>
    regs.forEach(r => r.unregister())
  );
  initOtaUpdates();
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <ToastProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </ToastProvider>
    </ErrorBoundary>
  </StrictMode>,
);
