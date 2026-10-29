---
name: ui-review
description: Review and improve a page/component's UI/UX, design-token usage, states, responsiveness and accessibility in the React SPA. Use when touching any page in src/pages or component in src/components, or for UI audits.
argument-hint: "[page or component path]"
---

1. Read the component and its data hooks. List the states it can be in (loading, empty, error, success, unauthorised).
2. Tokens: `grep -nE '#[0-9a-fA-F]{3,6}|bg-(red|blue|green|gray|slate|zinc)-[0-9]' <file>` → replace with semantic tokens from `tailwind.config.js` / `src/index.css`.
3. Accessibility: icon-only buttons have `aria-label`; images have `alt`; inputs have `<Label htmlFor>`; clickable elements are `<button>`/`<a>`; focus visible; dialogs use Radix primitives.
4. Responsive: check `sm:/md:/lg:` breakpoints; no fixed widths causing horizontal scroll at 375px.
5. Forms: react-hook-form + zod schema; field-level error messages.
6. Verify by rendering: `npm run dev`, open the page in the browser pane at desktop and 375px, screenshot. If you cannot render (e.g. needs backend data), state "not visually verified".
7. `npx eslint <file>` must not get worse.
