import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { resolve } from 'path';
import { copyFileSync, cpSync } from 'fs';

export default defineConfig({
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
	build: {
		lib: {
			entry: resolve(__dirname, 'src/main.js'),
			name: 'BpmnEditor',
			fileName: (format) => `bpmn-editor.${format}.js`
		}
	}
});
