#!/usr/bin/env node
/**
 * Ensures hosted CI builds (e.g. Vercel) define EXPO_PUBLIC_API_URL so the web app
 * never ships with a missing or implicit backend URL.
 */
const onVercel = process.env.VERCEL === '1';

if (!onVercel) {
  process.exit(0);
}

const url = process.env.EXPO_PUBLIC_API_URL?.trim();

if (!url) {
  console.error(
    '\n[build] EXPO_PUBLIC_API_URL is required on Vercel.\n' +
      'Set it under Project → Settings → Environment Variables to your single production API origin,\n' +
      'e.g. https://your-service.onrender.com (no trailing slash).\n'
  );
  process.exit(1);
}

if (!url.startsWith('https://')) {
  console.error('[build] EXPO_PUBLIC_API_URL must use https:// for production web builds.');
  process.exit(1);
}

process.exit(0);
