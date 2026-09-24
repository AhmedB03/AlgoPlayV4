import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
  plugins: [react()],
  // The CodeMirror chunk is ~510 kB but lazy-loaded when the workspace opens.
  build: { chunkSizeWarningLimit: 600, rollupOptions: { output: { manualChunks(id) {
    if (id.includes('node_modules')) {
      if (id.includes('codemirror') || id.includes('@lezer') || id.includes('@uiw')) return 'editor';
      if (id.includes('motion')) return 'animation';
      if (id.includes('react')) return 'react';
    }
  } } } }
});
