import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import App from './App.jsx';
import './index.css';
import { AuthProvider } from './context/AuthContext.jsx';
import { CartProvider } from './context/CartContext.jsx';
import { WishlistProvider } from './context/WishlistContext.jsx';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 3,
      refetchOnWindowFocus: false,
      // Request even when the browser reports offline. The default pauses the
      // query instead, which leaves no error behind: pages sat on a spinner,
      // a skeleton or "Product not available" rather than saying "You're
      // offline". Active queries still refetch on their own when it reconnects.
      networkMode: 'always',
      // A 4xx (not found, no access, signed out) gives the same answer on a
      // retry, and three retries kept its message behind ~7s of spinner; so
      // does retrying while offline. Other failures still retry, as before.
      retry: (failureCount, error) => {
        const status = error?.response?.status;
        return navigator.onLine && !(status >= 400 && status < 500) && failureCount < 3;
      },
    },
  },
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <CartProvider>
            <WishlistProvider>
              <App />
              <Toaster position="top-right" />
            </WishlistProvider>
          </CartProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);

// Google Analytics 4. VITE_GA_ID is set for Production only, so previews and
// local dev send nothing. Enhanced measurement counts SPA route changes from
// history events, so no per-route page_view call is needed.
const GA_ID = import.meta.env.VITE_GA_ID;
if (GA_ID) {
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() { window.dataLayer.push(arguments); };
  window.gtag('js', new Date());
  window.gtag('config', GA_ID);
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  document.head.appendChild(script);
}

// Production only: a service worker in dev would cache Vite's modules and fight HMR.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js'));
}
