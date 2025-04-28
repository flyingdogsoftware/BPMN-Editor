# BPMN Editor

A custom BPMN (Business Process Model and Notation) editor

Visit [Flying Dog](https://www.flyingdog.de) for more information.

## Features

- Custom BPMN editor built from scratch
- Svelte for reactive UI components
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
│   ├── components/            # UI components
│   │   ├── connections/       # Connection-related components
│   │   ├── renderers/         # Element rendering components
│   │   ├── toolbar/           # Editor toolbar components
│   │   └── BpmnEditor.svelte  # Main editor component
│   ├── models/                # Data models
│   ├── services/              # Service modules
│   ├── stores/                # Svelte stores for state management
│   ├── types/                 # Type definitions
│   └── utils/                 # Utility functions
│       └── xml/               # XML processing utilities
├── routes/                    # SvelteKit routes
│   ├── connection-test/       # Connection testing routes
│   ├── test/                  # Test routes
│   ├── test-connections/      # Connection test routes
│   ├── test-export/           # Export testing routes
│   └── test-import/           # Import testing routes
└── styles/                    # Global styles
```

> This project is a custom implementation of a BPMN editor without using bpmn-js or other existing libraries.
