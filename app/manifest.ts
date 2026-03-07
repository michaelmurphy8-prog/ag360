import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'AG360',
    short_name: 'AG360',
    description: 'For the Farmer',
    start_url: '/mobile',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#070D18',
    theme_color: '#070D18',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  }
}