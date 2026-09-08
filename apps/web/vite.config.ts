import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'


function figmaAssetResolver() {
  return {
    name: 'figma-asset-resolver',
    resolveId(id) {
      if (id.startsWith('figma:asset/')) {
        const filename = id.replace('figma:asset/', '')
        return path.resolve(__dirname, 'visual/imports', filename)
      }
    },
  }
}

export default defineConfig({
  plugins: [
    figmaAssetResolver(),
    // The React and Tailwind plugins are both required for Make, even if
    // Tailwind is not being actively used – do not remove them
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@nakshra/shared-types': path.resolve(__dirname, '../../packages/shared-types/src'),
      '@nakshra/shared-config': path.resolve(__dirname, '../../packages/shared-config/src'),
      '@nakshra/shared-utils': path.resolve(__dirname, '../../packages/shared-utils/src'),
      '@nakshra/shared-services': path.resolve(__dirname, '../../packages/shared-services/src'),
      '@nakshra/shared-api': path.resolve(__dirname, '../../packages/shared-api/src'),
      '@nakshra/shared-auth': path.resolve(__dirname, '../../packages/shared-auth/src'),
      '@nakshra/shared-state': path.resolve(__dirname, '../../packages/shared-state/src'),
      '@nakshra/shared-hooks': path.resolve(__dirname, '../../packages/shared-hooks/src'),
      '@nakshra/shared-validation': path.resolve(__dirname, '../../packages/shared-validation/src'),
      '@visual': path.resolve(__dirname, './visual'),
      '@': path.resolve(__dirname, './visual'),
    },
  },

  // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
  assetsInclude: ['**/*.svg', '**/*.csv'],

  build: {
    rollupOptions: {
      output: {
        // Split heavy third-party libs into their own chunks so the main app
        // bundle is smaller and vendor code stays cached across app deploys.
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          if (id.includes('recharts') || id.includes('d3-')) return 'vendor-charts'
          if (id.includes('@radix-ui')) return 'vendor-radix'
          if (id.includes('motion') || id.includes('framer-motion')) return 'vendor-motion'
          if (id.includes('i18next') || id.includes('react-i18next')) return 'vendor-i18n'
          if (id.includes('firebase') || id.includes('@firebase')) return 'vendor-firebase'
          if (id.includes('@supabase')) return 'vendor-supabase'
          if (id.includes('lucide-react')) return 'vendor-icons'
          if (id.includes('react-router') || id.includes('react-dom') || id.includes('/react/')) return 'vendor-react'
        },
      },
    },
  },
})
