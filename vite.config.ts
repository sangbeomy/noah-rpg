import { defineConfig } from 'vite';
// base './' lets the same build work on Netlify and GitHub Pages (any sub-path)
export default defineConfig({ base: './', build: { chunkSizeWarningLimit: 2000 } });
