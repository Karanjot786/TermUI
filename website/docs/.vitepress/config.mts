import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "TermUI",
  description: "A modern terminal UI framework for building rich CLI applications with React-like components.",
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Guide', link: '/guide/getting-started' },
      { text: 'API Reference', link: '/api/core' }
    ],

    sidebar: [
      {
        text: 'Guide',
        items: [
          { text: 'Getting Started', link: '/guide/getting-started' },
          { text: 'Architecture', link: '/guide/architecture' }
        ]
      },
      {
        text: 'API Reference',
        items: [
          { text: '@termuijs/core', link: '/api/core' },
          { text: '@termuijs/store', link: '/api/store' },
          { text: '@termuijs/jsx', link: '/api/jsx' }
        ]
      }
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/Karanjot786/TermUI' }
    ]
  }
})
