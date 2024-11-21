import { vitePreprocess } from '@sveltejs/vite-plugin-svelte'
import adapter from '@sveltejs/adapter-vercel'

export default {
  kit: {
    adapter: adapter()
  },
  preprocess: vitePreprocess(),
}
