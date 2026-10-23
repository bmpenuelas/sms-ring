import '@fontsource-variable/inter-tight'
import '@fontsource-variable/unbounded'
import { createApp } from 'vue'

import './styles/base.css'
import App from './App.vue'
import { handleBackButton } from './services/backButton'
import { startTheme } from './state/theme'

startTheme()
handleBackButton()
createApp(App).mount('#app')
