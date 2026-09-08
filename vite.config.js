import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { resolve } from 'path';
import { copyFileSync, cpSync } from 'fs';

export default defineConfig(({ command }) => {
	const isProduction = command === 'build';

	return {
		// static/ ist im Bau das Wurzelverzeichnis der Auslieferung
		// (siehe copy-assets). Damit im Entwicklungsserver dieselben Pfade
		// gelten, wird es auch dort als oeffentliches Verzeichnis gefuehrt.
		publicDir: 'static',
		plugins: [
			svelte(),
			{
				name: 'copy-assets',
				writeBundle() {
					copyFileSync('simple.html', 'dist/index.html');
					cpSync('static', 'dist', { recursive: true });
				}
			}
		],
		// Only use lib config for production builds
		...(isProduction && {
			build: {
					target: 'es2020',
				lib: {
					entry: resolve(__dirname, 'src/main.js'),
					name: 'BpmnEditor',
					fileName: (format) => `bpmn-editor.${format}.js`
				}
			}
		})
	};
});
