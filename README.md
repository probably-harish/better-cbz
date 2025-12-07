# Comic Reader

A production-ready, in-browser CBZ/CBR comic and manga reader with library management.

## Features

- **Library Management**: Link local folders to build your comic library with cover previews
- **Multiple Reading Modes**: Vertical scroll, single page, or two-page spread
- **Reading Direction**: LTR (western) or RTL (manga) with easy toggle
- **Keyboard Navigation**: Arrow keys, space, home/end, and more
- **Touch Gestures**: Swipe to turn pages on mobile
- **Progress Tracking**: Automatically saves your reading position per volume
- **Zoom Controls**: Fit-width, fit-height, or custom zoom
- **Invert Colors**: Toggle for comfortable night reading
- **Fullscreen Mode**: Immersive reading experience
- **Responsive Design**: Works on desktop and mobile

## Quick Start

### Development
```bash
npm install
npm run dev
```

### Production Build
```bash
npm run build
```

The built files will be in the `dist/` folder, ready to deploy to any static host.

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| ← / → | Previous/Next page (direction-aware) |
| ↑ / ↓ | Previous/Next page (in paged modes) |
| Space | Next page |
| Home / End | First/Last page |
| V | Vertical scroll mode |
| 1 | Single page mode |
| 2 | Two-page spread mode |
| D | Toggle reading direction (LTR/RTL) |
| I | Invert colors |
| F | Fullscreen |
| Esc | Back to library |

## Browser Support

- **Full features** (including library): Chrome, Edge (Chromium-based browsers)
- **Basic features** (single file): Firefox, Safari

The library feature uses the File System Access API which is only available in Chromium browsers. Other browsers can still open individual CBZ files.

## Legacy Version

The original single-file version is preserved as `index.old.html` for environments where a simple, portable solution is preferred.
