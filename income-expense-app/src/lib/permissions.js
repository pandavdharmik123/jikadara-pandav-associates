import { hasPageAccess } from '../utils/pagePermissions';
import { ALL_TOOL_ITEMS } from '../features/Tools/toolsCatalog';

export function canUseOfficeLedger(user) {
  if (!user) return false;

  // Mirrors the existing website's page-permission rules for Office Reports.
  if (user.role === 'ADMIN') return true;

  const allowed = user.allowedPages;
  if (!Array.isArray(allowed) || allowed.length === 0) return true;

  return allowed.includes('/app/office-expenses');
}

/** The page key the website stores for a tool in Admin → Users. */
export function toolPermissionKey(tool) {
  return tool?.permissionKey || tool?.key;
}

export function canAccessTool(user, tool) {
  if (!user || !tool) return false;
  return hasPageAccess(user, toolPermissionKey(tool));
}

export function getAccessibleTools(user) {
  return ALL_TOOL_ITEMS.filter((tool) => canAccessTool(user, tool));
}

export function hasAnyToolAccess(user) {
  return getAccessibleTools(user).length > 0;
}
