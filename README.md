# BPMN Editor

A custom BPMN (Business Process Model and Notation) editor built with Svelte 4 and TypeScript.

## Features

- Custom BPMN editor built from scratch
- TypeScript support for type safety
- Svelte 4 for reactive UI components
- SvelteKit for routing and project structure
- Support for BPMN elements (tasks, events, gateways)
- Interactive canvas for diagram editing

## Developing

Once you've created a project and installed dependencies with `npm install` (or `pnpm install` or `yarn`), start a development server:

```bash
npm run dev

# or start the server and open the app in a new browser tab
npm run dev -- --open
```

## Building

To create a production version of your app:

```bash
npm run build
```

You can preview the production build with `npm run preview`.

## Project Structure

```
src/
├── lib/
│   ├── components/    # UI components
│   │   └── BpmnEditor.svelte
│   ├── stores/        # Svelte stores for state management
│   │   └── bpmnStore.ts
│   ├── types/         # TypeScript type definitions
│   │   └── bpmn.ts
│   └── index.ts       # Library exports
├── routes/            # SvelteKit routes
│   └── +page.svelte   # Main page
├── styles/            # Global styles
│   └── global.css
├── app.d.ts           # TypeScript declarations
└── app.html           # HTML template
```

> This project is a custom implementation of a BPMN editor without using bpmn-js or other existing libraries.
