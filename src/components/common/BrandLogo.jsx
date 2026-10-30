import logoUrl from "@/assets/brand/protocall-logo.png";
import logoDarkUrl from "@/assets/brand/protocall-logo-dark.png";

/**
 * The PROTOCALL mark (segmented target with four dots). One helper for every
 * place the brand appears — app and portal sidebars, auth screens, footer,
 * promo cards, the public Home page — so the mark cannot drift between screens.
 *
 * Two transparent cuts of the same artwork:
 *  - "light" (default): white glyph, for navy/purple sidebars and gradients.
 *  - "dark": ink glyph, for cream or white surfaces such as the Home header.
 *
 * Decorative by default (alt=""), because it always sits next to the
 * "PROTOCALL" wordmark; pass `label` where the mark stands alone.
 *
 * Render helper (not a component), following the codebase's no-propTypes
 * style — see renderComingSoonItem in pages/Layout.jsx.
 */
export function renderBrandLogo(className = "h-9 w-9", label = "", tone = "light") {
  return (
    <img
      src={tone === "dark" ? logoDarkUrl : logoUrl}
      alt={label}
      aria-hidden={label ? undefined : true}
      draggable="false"
      className={`shrink-0 select-none object-contain ${className}`}
    />
  );
}
