/**
 * Classes for a Super Admin sidebar tab.
 *
 * The base TabsTrigger sets `data-[state=active]:text-foreground` (dark),
 * which outranks a plain `text-white`, so the selected item rendered black on
 * the purple gradient. The active state is overridden with the same selector.
 */
export const sidebarTabClass = (isActive) =>
  `w-full justify-start px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 border-none data-[state=active]:bg-transparent data-[state=active]:text-white data-[state=active]:shadow-lg ${
    isActive
      ? 'bg-gradient-to-r from-protocall-deep to-protocall-blue text-white shadow-protocall-deep/30'
      : 'text-sidebar-muted-foreground hover:bg-protocall-ink hover:text-white'
  }`;
