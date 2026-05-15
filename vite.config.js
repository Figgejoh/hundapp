import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
	plugins: [
		sveltekit(),
		VitePWA({
			registerType: 'autoUpdate',
			includeAssets: ['icons/dog.png', 'images/placeholder.svg'],
			manifest: {
				name: 'HundApp – Hitta hundvänliga badplatser',
				short_name: 'HundApp',
				description: 'Hitta hundvänliga badplatser i Sverige',
				theme_color: '#4CAF50',
				background_color: '#ffffff',
				display: 'standalone',
				start_url: '/',
				icons: [
					{ src: '/icons/pwa-192.png', sizes: '192x192', type: 'image/png' },
					{ src: '/icons/pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
				]
			},
			workbox: {
				globPatterns: ['**/*.{js,css,html,svg,png}'],
				runtimeCaching: [
					{
						urlPattern: /^https:\/\/\w+\.tile\.openstreetmap\.org\/.*/i,
						handler: 'CacheFirst',
						options: { cacheName: 'osm-tiles', expiration: { maxEntries: 500, maxAgeSeconds: 7 * 24 * 60 * 60 } }
					}
				]
			}
		})
	]
});
