import { defineVuetifyConfiguration } from 'vuetify-nuxt-module/custom-configuration'
import { ru } from 'vuetify/locale'

export default defineVuetifyConfiguration({
  locale: {
    locale: 'ru',
    fallback: 'en',
    messages: { ru }
  },
  theme: {
    defaultTheme: 'dark',
    themes: {
      dark: {
        dark: true,
        colors: {
          background: '#10110B',
          surface: '#171a11',
          primary: '#009917',
          secondary: '#4a7fe6',
          'on-background': '#ffffff',
          'on-surface': '#ffffff',
          'on-surface-variant': '#ffffff',
        },
      }
    }
  },
  defaults: {
    VBtn: {
      class: 'text-body-2',
      style: 'border-radius: 8px;'
    },
    VCheckboxBtn: {
      style: 'gap: 4px;'
    },
    global: {
      ripple: false,
      elevation: 0,
    },
  },
  icons: {
    defaultSet: 'mdi-svg',
  },
  labComponents: [],
})