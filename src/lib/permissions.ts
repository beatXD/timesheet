import type { UserRole } from "@/types";

/**
 * Permission utilities for role-based access control
 */
export const Permissions = {
  // Timesheet permissions
  canApproveTimesheet: (role: UserRole) => ["admin", "leader"].includes(role),
  canFinalApprove: (role: UserRole) => role === "admin",
  canSubmitToAdmin: (role: UserRole) => ["admin", "leader"].includes(role),

  // Team permissions
  canManageTeam: (role: UserRole) => ["admin", "leader"].includes(role),
  canViewAllTeams: (role: UserRole) => role === "admin",
  canManageTeamMembers: (role: UserRole) => ["admin", "leader"].includes(role),

  // Admin permissions
  canAccessAdmin: (role: UserRole) => role === "admin",
  canManageUsers: (role: UserRole) => role === "admin",
  canManageHolidays: (role: UserRole) => role === "admin",
  canManageVendors: (role: UserRole) => role === "admin",
  canManageProjects: (role: UserRole) => role === "admin",

  // Leave permissions
  canApproveLeave: (role: UserRole) => ["admin", "leader"].includes(role),
  canViewAllLeaves: (role: UserRole) => role === "admin",
};

/**
 * Path-based access control mapping
 * Defines which roles can access which paths
 */
export const PathAccess: Record<string, UserRole[]> = {
  "/admin": ["admin"],
  "/admin/users": ["admin"],
  "/admin/teams": ["admin"],
  "/admin/vendors": ["admin"],
  "/admin/projects": ["admin"],
  "/admin/holidays": ["admin"],
  "/admin/leaves": ["admin"],
  "/team": ["admin", "leader"],
  "/team/members": ["admin", "leader"],
  "/team/leaves": ["admin", "leader"],
};

/**
 * Check if a role can access a given path
 */
export function canAccessPath(role: UserRole, path: string): boolean {
  // Find the most specific matching path
  const matchingPaths = Object.keys(PathAccess)
    .filter((p) => path.startsWith(p))
    .sort((a, b) => b.length - a.length);

  if (matchingPaths.length === 0) {
    // No restriction defined, allow access
    return true;
  }

  const allowedRoles = PathAccess[matchingPaths[0]];
  return allowedRoles.includes(role);
}
