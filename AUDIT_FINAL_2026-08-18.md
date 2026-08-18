# CocoLoco Live Manager — Final Audit

Final reconstruction marker. The verification workflow checks the application build and Node test suite against the current main tree.

Required overlay entry points:
- `src/components/overlay.jsx`
- `src/components/overlay/index.jsx`
- `src/pages/OverlayPage.jsx`
- `src/components/overlay/OverlayPreview.jsx`

Required test infrastructure:
- `tests/esm-extension-loader.mjs`
- `npm test` uses the ESM extension loader.
