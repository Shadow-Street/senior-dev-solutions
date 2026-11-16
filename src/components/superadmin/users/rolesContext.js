import { createContext } from 'react';

/**
 * Shared state for Roles & Permissions, read through context instead of props
 * (the codebase's no-propTypes style, see components/common/BrandLogo.jsx).
 *
 *   RolesContext      { data, templates, reload, access } — matrix payload,
 *                     role templates, reload(), the caller's access
 *   RoleFormContext   { formRole, setFormRole } — undefined closed, null
 *                     create, a role object to edit
 *   TemplateUiContext { editing, setEditing, fromTemplate, setFromTemplate }
 */
export const RolesContext = createContext({ data: null, templates: [], reload: () => {}, access: null });
export const RoleFormContext = createContext({ formRole: undefined, setFormRole: () => {} });
export const TemplateUiContext = createContext({ editing: undefined, setEditing: () => {}, fromTemplate: null, setFromTemplate: () => {} });
