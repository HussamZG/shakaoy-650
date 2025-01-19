import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // تقليل عمليات إعادة التحميل
    hmr: {
      overlay: false // إخفاء رسائل الخطأ
    },
    // تحسين أداء الخادم المحلي
    strictPort: true,
    port: 5174
  },
  // تحسين الأداء وتقليل حجم البناء
  build: {
    chunkSizeWarningLimit: 1000, // زيادة الحد الأقصى لحجم الكتل
    rollupOptions: {
      output: {
        manualChunks(id) {
          // تقسيم الحزم بشكل أكثر كفاءة
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        }
      }
    }
  },
  // تحسين معالجة الأصول الثابتة
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', '@supabase/supabase-js'],
    force: true // إجبار إعادة حساب التبعيات
  }
})
