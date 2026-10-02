import { resolve } from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
	server: {
		port: Number(process.env.npm_config_port || 8000),
	},
	build: {
		rollupOptions: {
			input: {
				index: resolve(import.meta.dirname, 'index.html'),
				'type-system': resolve(import.meta.dirname, 'type-system.html'),
			},
		},
	},
});
