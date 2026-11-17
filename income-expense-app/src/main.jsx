import ReactDOM from 'react-dom/client';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { App as NativeApp } from '@capacitor/app';
import { Keyboard } from '@capacitor/keyboard';
import 'antd/dist/reset.css';
import './lib/browserPolyfills';
import './lib/transliterationFetch';
import './styles/global.css';
import './styles/tools.css';
import './styles/pdf-print.scss';
import App from './App';

const isNative = Capacitor.isNativePlatform();

if (isNative) {
  // Marks the document so CSS can add notch/status-bar safe-area padding only
  // inside the native shells, never in the browser/PWA build.
  document.body.classList.add('native-app');
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);

async function bootstrapNativeShell() {
  if (!isNative) return;

  const platform = Capacitor.getPlatform();

  try {
    // White app bar with dark status-bar icons.
    // Capacitor naming is inverted: Style.Light = dark text/icons for light bars.
    await StatusBar.setStyle({ style: Style.Light });
    if (platform === 'android') {
      await StatusBar.setBackgroundColor({ color: '#ffffff' });
      await StatusBar.setOverlaysWebView({ overlay: false });
    }
  } catch {
    // Status bar is cosmetic; never block the app on it.
  }

  if (platform === 'ios') {
    Keyboard.setAccessoryBarVisible({ isVisible: false }).catch(() => {});
  }

  // Android hardware/gesture back: step through the HashRouter history, then
  // leave the app from Home/Login instead of dropping the user on a blank page.
  NativeApp.addListener('backButton', ({ canGoBack }) => {
    const hash = window.location.hash || '#/';
    const atRoot = hash === '#/' || hash === '#/login' || hash === '';

    if (!atRoot && (canGoBack || window.history.length > 1)) {
      window.history.back();
      return;
    }

    NativeApp.exitApp().catch(() => {});
  });

  // Hide the native splash only after React has painted the first screen.
  requestAnimationFrame(() => {
    setTimeout(() => {
      SplashScreen.hide().catch(() => {});
    }, 250);
  });
}

bootstrapNativeShell();

// Online-first PWA: only the static shell is cached; API calls always hit the
// network so this app and the main website never show different records.
// Service workers are disabled inside the Capacitor native shells.
if ('serviceWorker' in navigator && import.meta.env.PROD && !isNative) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((error) => {
      console.warn('Service worker registration failed:', error);
    });
  });
}
