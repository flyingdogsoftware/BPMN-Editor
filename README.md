# BPMN Editor

A custom BPMN (Business Process Model and Notation) editor built with Svelte

Visit [Flying Dog](https://www.flyingdog.de) for more information.

## Features

- Custom BPMN editor built from scratch
- Pure Svelte component library
- Support for BPMN elements (tasks, events, gateways)
- Interactive canvas for diagram editing
- Easy integration into any web application
- No server dependencies - runs entirely client-side

## Installation

Install the package via npm:

```bash
npm install @fds-components-public/bpmn-editor
```

## Usage

### As ES Module

```javascript
import BpmnEditor from '@fds-components-public/bpmn-editor';
import '@fds-components-public/bpmn-editor/dist/style.css';

const editor = new BpmnEditor({
    target: document.getElementById('bpmn-editor')
});
```

### As Script Tag (No Dependencies Required)

```html
<link rel="stylesheet" href="./node_modules/@fds-components-public/bpmn-editor/dist/style.css">
<script src="./node_modules/@fds-components-public/bpmn-editor/dist/bpmn-editor.umd.js"></script>

<div id="bpmn-editor"></div>

<script>
    const editor = new BpmnEditor.default({
        target: document.getElementById('bpmn-editor')
    });
</script>
```

**Note**: The UMD build includes Svelte bundled, so no external dependencies are required.

## Developing

Once you've cloned the project and installed dependencies with `npm install`, start the development server:

```bash
npm run dev
```

This will start Vite dev server and open the demo page.

## Building

To create a production version of the library:

```bash
npm run build
```

This creates the distributable files in the `dist/` directory.

## Demo

### Quick Start (Production Build)

To run the editor from the built files:

```bash
npm run build
npm run start
```

This will serve the `dist/index.html` file at `http://localhost:3000` which loads the BPMN editor using the production bundle.

### Development

For development with hot reload:

```bash
npm run dev
```

### Other Demo Options

- Open `demo.html` in your browser to see how to use the built library
- Open `simple.html` for a minimal example

## API

The BPMN Editor exports the following:

```javascript
import BpmnEditor, {
    bpmnStore,
    importBpmnXml,
    exportBpmnXml,
    exportSvg
} from '@fds-components-public/bpmn-editor';

// Main component
const editor = new BpmnEditor({ target: element });

// Access to the store for programmatic control
bpmnStore.addElement(element);
bpmnStore.removeElement(id);

// Import/Export utilities
const elements = importBpmnXml(xmlString);
const xml = exportBpmnXml(elements);
const svg = exportSvg(elements);
```

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
├── styles/                    # Global styles
└── main.js                    # Library entry point
│   ├── test/                  # Test routes
│   ├── test-connections/      # Connection test routes
│   ├── test-export/           # Export testing routes
│   └── test-import/           # Import testing routes
└── styles/                    # Global styles
```

> This project is a custom implementation of a BPMN editor without using bpmn-js or other existing libraries.
