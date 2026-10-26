import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        'process.env.OPENROUTER_API_KEY': JSON.stringify(env.OPENROUTER_API_KEY || env.OPENROUTER_API_KEY_1 || ''),
        'process.env.OPENROUTER_API_KEY_1': JSON.stringify(env.OPENROUTER_API_KEY_1 || env.OPENROUTER_API_KEY || ''),
        'process.env.OPENROUTER_API_KEY_2': JSON.stringify(env.OPENROUTER_API_KEY_2 || ''),
        'process.env.OPENROUTER_API_KEY_3': JSON.stringify(env.OPENROUTER_API_KEY_3 || ''),
        'process.env.OPENROUTER_API_KEY_4': JSON.stringify(env.OPENROUTER_API_KEY_4 || ''),
        'process.env.OPENROUTER_API_KEY_5': JSON.stringify(env.OPENROUTER_API_KEY_5 || ''),
        'process.env.OPENROUTER_MODEL': JSON.stringify(env.OPENROUTER_MODEL || 'google/gemini-2.0-flash-001'),
        'process.env.API_KEY': JSON.stringify(env.OPENROUTER_API_KEY || env.GEMINI_API_KEY_1 || ''),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY_1 || ''),
        'process.env.GEMINI_API_KEY_1': JSON.stringify(env.GEMINI_API_KEY_1 || ''),
        'process.env.GEMINI_API_KEY_2': JSON.stringify(env.GEMINI_API_KEY_2 || ''),
        'process.env.GEMINI_API_KEY_3': JSON.stringify(env.GEMINI_API_KEY_3 || ''),
        'process.env.GEMINI_API_KEY_4': JSON.stringify(env.GEMINI_API_KEY_4 || ''),
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
