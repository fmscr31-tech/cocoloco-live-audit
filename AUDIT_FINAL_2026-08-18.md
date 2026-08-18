# CocoLoco Live Manager — Final Audit

This marker exists only to force a final CI verification run against the current `main` tree after the reconstruction pass.

Required overlay entry points:
- `src/components/overlay.jsx`
- `src/components/overlay/index.jsx`
- `src/pages/OverlayPage.jsx`
- `src/components/overlay/OverlayPreview.jsx`

Required test infrastructure:
- `tests/esm-extension-loader.mjs`
- `npm test` uses the loader for Node ESM compatibility.
