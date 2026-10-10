import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Reuse the backend's self-signed certificate so the frontend is also served over HTTPS.
// If it has not been generated yet, fall back to plain HTTP.
const certDir = fileURLToPath(new URL('../hustlehub-backend/certs/', import.meta.url));
const keyFile = `${certDir}key.pem`;
const certFile = `${certDir}cert.pem`;
const https = fs.existsSync(keyFile) && fs.existsSync(certFile)
  ? { key: fs.readFileSync(keyFile), cert: fs.readFileSync(certFile) }
  : undefined;

// The browser only talks to this server; /api calls are forwarded to the backend.
// "secure: false" accepts the backend's self-signed certificate (local development only).
const apiTarget = process.env.VITE_API_TARGET || 'https://localhost:5000';
const proxy = { '/api': { target: apiTarget, changeOrigin: true, secure: false } };

// Content Security Policy. The production build (npm start / npm run preview) uses the strict policy.
// The dev server needs 'unsafe-inline' and websockets for hot reloading, so its policy is looser.
function contentSecurityPolicy({ dev }) {
  return [
    "default-src 'self'",
    `script-src 'self'${dev ? " 'unsafe-inline'" : ''}`,
    `style-src 'self'${dev ? " 'unsafe-inline'" : ''}`,
    "img-src 'self' data:",
    "font-src 'self'",
    `connect-src 'self'${dev ? ' ws: wss:' : ''}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join('; ');
}

const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'no-referrer',
  'Permissions-Policy': 'geolocation=(), camera=(), microphone=()',
};

export default defineConfig({
  plugins: [react()],
  build: { assetsInlineLimit: 0 }, // keep fonts as real files so font-src 'self' is enough
  server: { port: 5173, https, proxy, headers: { ...securityHeaders, 'Content-Security-Policy': contentSecurityPolicy({ dev: true }) } },
  preview: { port: 5173, https, proxy, headers: { ...securityHeaders, 'Content-Security-Policy': contentSecurityPolicy({ dev: false }) } },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.js',
    css: false,
  },
});
