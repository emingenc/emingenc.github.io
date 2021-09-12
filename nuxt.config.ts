/* Import base config */
import buildModules from "./config/buildModules"
import components from "./config/components"
import generate from "./config/generate"
import css from "./config/css"
import head from "./config/head"
import loading from "./config/loading"
import modules from "./config/modules"
import plugins from "./config/plugins"
import publicRuntimeConfig from "./config/publicRuntimeConfig"

/* Import specific module options */
import vite from "./config/modules/vite"

/* Types */
import { NuxtConfig } from "@nuxt/types"

const Config: NuxtConfig = {
  // Constant options
  rootDir: "./",
  srcDir: "src",
  target: "static",
  prefix: false,
  ssr: true,
  

  // Imported options
  head,
  loading,
  buildModules: [
    '@nuxtjs/google-analytics'
  ],
  googleAnalytics: {
    id: process.env.GOOGLE_ANALYTICS_ID,
  },
  components,
  generate,
  css,
  modules,
  plugins,
  publicRuntimeConfig: {
    googleAnalytics: {
      id: process.env.GOOGLE_ANALYTICS_ID
    }
  },

  

  // Modules
  vite,
}

export default Config
