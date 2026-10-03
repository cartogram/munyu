import { resolve } from 'path';
import { defineConfig } from 'vite';

// The persona SVGs aren't part of the module graph, so Vite wouldn't notice
// when `npm run personas:watch` rewrites them; reload the page when it does.
const reloadPersonas = {
	name: 'reload-personas',
	configureServer(server) {
		server.watcher.add('media/personas');
		server.watcher.on('change', (file) => {
			if (/media\/personas\/[^/]+\.svg$/.test(file)) server.ws.send({ type: 'full-reload' });
		});
	},
};

export default defineConfig({
	plugins: [reloadPersonas],
	server: {
		port: Number(process.env.npm_config_port || 8000),
	},
	build: {
		rollupOptions: {
			input: {
				index: resolve(import.meta.dirname, 'index.html'),
				system: resolve(import.meta.dirname, 'system.html'),
			},
		},
	},
});
