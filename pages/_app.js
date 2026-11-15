import { useEffect } from "react";
import "@/styles/globals.css";

export default function App({ Component, pageProps }) {
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .catch((err) => console.error("Service Worker 註冊失敗:", err));
    }
  }, []);

  return <Component {...pageProps} />;
}
