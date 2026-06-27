import { defineConfig, presetUno, presetIcons } from 'unocss'
import mdiIcons from '@iconify-json/mdi/icons.json'

export default defineConfig({
  presets: [
    presetUno(),
    presetIcons({
      scale: 1.2,
      extraProperties: {
        'display': 'inline-block',
        'vertical-align': 'middle'
      },
      collections: {
        mdi: () => mdiIcons,
      },
    })
  ],
  shortcuts: {
    'panel-drag': 'h-10 flex items-center px-3',
    'sidebar-item': 'px-3 py-2 cursor-pointer rounded-md text-sm transition-colors duration-150',
    'sidebar-item-active': 'bg-blue-50 text-blue-600 font-medium',
    'sidebar-item-normal': 'text-gray-600 hover:bg-gray-100',
    'btn-primary': 'px-3 py-1.5 bg-blue-500 text-white rounded-md hover:bg-blue-600 text-sm transition-colors duration-150',
    'btn-ghost': 'px-3 py-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md text-sm transition-colors duration-150',
    'tag-chip': 'px-2 py-0.5 text-xs rounded-full cursor-pointer transition-colors duration-150',
    'tag-chip-active': 'bg-blue-500 text-white',
    'tag-chip-inactive': 'bg-gray-100 text-gray-500 hover:bg-gray-200',
    'card': 'flex flex-col items-center p-3 rounded-lg cursor-pointer transition-all duration-150 hover:bg-gray-50',
    'card-selected': 'ring-2 ring-blue-500 bg-blue-50',
    'card-icon': 'w-10 h-10 flex items-center justify-center text-2xl mb-1',
    'card-name': 'text-xs text-center text-gray-700 truncate w-full',
    'card-invalid': 'opacity-40 grayscale',
    'dialog-overlay': 'fixed inset-0 bg-black/30 flex items-center justify-center z-50',
    'dialog-panel': 'bg-white rounded-xl shadow-lg p-5 min-w-80'
  },
  theme: {
    colors: {
      bg: '#f8f9fa',
      surface: '#ffffff',
      border: '#e5e7eb'
    }
  }
})
