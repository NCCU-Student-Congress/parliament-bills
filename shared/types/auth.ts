export const permissionRoles = ['legislator', 'secretariat_admin'] as const;

export type PermissionRole = (typeof permissionRoles)[number];

export function isPermissionRole(value: unknown): value is PermissionRole {
  return typeof value === 'string' && permissionRoles.includes(value as PermissionRole);
}
