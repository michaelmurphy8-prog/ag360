import { MetadataRoute } from 'next'
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Connect360',
    short_name: 'Connect360',
    description: 'The Agricultural Services Marketplace',
    start_url: '/home',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#F7F5F0',
    theme_color: '#C9A84C',
    icons: [
      { src: '/connect360-icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/connect360-icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  }
}
