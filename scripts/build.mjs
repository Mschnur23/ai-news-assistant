import { mkdir, copyFile } from 'node:fs/promises';
await mkdir('dist', { recursive: true });
// Explicit public allowlist keeps local secrets and backend source out of static output.
for (const file of ['index.html', 'style.css', 'app.js']) await copyFile(file, `dist/${file}`);
console.log('Built static assets in dist; Vercel deploys api/ as serverless routes.');
