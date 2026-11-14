import os from "os";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 自動取得本機區域網路 IP 與外部 Tunnel (ngrok / cloudflare) 網域，避免被 Next.js 阻擋 /_next/hmr
const localOrigins = [
  "localhost",
  "127.0.0.1",
  "192.168.0.177",
  "*.ngrok-free.app",
  "*.ngrok-free.dev",
  "*.ngrok.io",
  "*.ngrok.app",
  "*.trycloudflare.com",
  "*.loca.lt",
];
const interfaces = os.networkInterfaces();
for (const name of Object.keys(interfaces)) {
  for (const net of interfaces[name] || []) {
    if (net.family === "IPv4" && !net.internal && !localOrigins.includes(net.address)) {
      localOrigins.push(net.address);
    }
  }
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: localOrigins,
  turbopack: {
    root: __dirname,
  },
  reactStrictMode: true,
};

export default nextConfig;
