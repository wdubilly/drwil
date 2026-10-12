# Frontend quality (optional)

Module **not installed by default**: `scaffold()` does not copy this
folder. Copy it by hand into the project that needs it (a frontend with a
colour style guide to enforce), until a dedicated adoption recipe exists.

## Contents

- `check-colors.mjs`: no hard-coded colour (hex, `rgb()`, `hsl()`) and no
  Tailwind palette outside the style guide in the frontend source, outside
  the theme folder.
- `check-contrast.mjs`: RGAA 4.1 / WCAG AA text/background contrast
  (4.5:1, 3:1 for large text) of every class combination actually written,
  in light and dark, from a palette module of the project.

## Activation

1. Copy both files into the project's `.githooks/`.
2. Declare a palette module (scales exported like a Tailwind config, e.g.
   `{ slate: { 50: "#...", 900: "#..." } }`).
3. Add both checks to `.drwil/ia-first.json -> checks`, for example:

```json
{ "name": "colours outside the style guide", "run": "node .githooks/check-colors.mjs frontend src/theme" },
{ "name": "contrasts", "run": "node .githooks/check-contrast.mjs frontend src/theme/palettes.js src/theme" }
```

Arguments of `check-contrast.mjs`: root, path of the palette module
(relative to the root), theme folder (relative to the root, excluded from
the scan), and optionally a JSON of light/dark tokens if the project's
palette does not name its shades `slate-900`, `slate-50`, etc. (see the
comment at the top of the file).
