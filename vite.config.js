import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { resolve } from 'path';

export default defineConfig({
	plugins: [svelte()],
	build: {
		lib: {
			entry: resolve(__dirname, 'src/main.js'),
			name: 'BpmnEditor',
			fileName: (format) => `bpmn-editor.${format}.js`
		},
		rollupOptions: {
			external: ['svelte'],
			output: {
				exports: 'named',
				globals: {
					svelte: 'Svelte'
				}
			}
		}
	}
});
