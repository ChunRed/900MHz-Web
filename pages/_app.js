import { useEffect } from "react";
import "@/styles/globals.css";

export default function App({ Component, pageProps }) {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    if (process.env.NODE_ENV === "production") {
      navigator.serviceWorker
        .register("/sw.js")
        .catch((err) => console.error("Service Worker 註冊失敗:", err));
    } else {
      // 開發模式註銷 Service Worker 並清除舊快取，避免快取舊版 SSR HTML 造成 Hydration 錯誤
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((reg) => reg.unregister());
      });
      if ("caches" in window) {
        caches.keys().then((keys) => {
          keys.forEach((key) => caches.delete(key));
        });
      }
    }
  }, []);

  return <Component {...pageProps} />;
}
