import type { UserRole } from "@/types";

/**
 * Permission utilities for role-based access control
 *
 * Role hierarchy:
 * - super_admin: System oversight, manage subscriptions, view reports, export data (no approval)
 * - admin: Team leader, invite members, approve timesheets, manage own team
 * - user: Team member or individual (self-managed with Free plan)
 */
export const Permissions = {
  // Super Admin permissions (system-wide)
  canAccessSuperAdmin: (role: UserRole) => role === "super_admin",
  canManageSubscriptions: (role: UserRole) => role === "super_admin",
  canViewAllOrganizations: (role: UserRole) => role === "super_admin",
  canExportSystemData: (role: UserRole) => role === "super_admin",
  canManageSystemSettings: (role: UserRole) => role === "super_admin",

  // Timesheet permissions (admin = team leader)
  canApproveTimesheet: (role: UserRole) => role === "admin",
  canViewTeamTimesheets: (role: UserRole) => ["super_admin", "admin"].includes(role),

  // Team permissions (admin = team leader)
  canManageTeam: (role: UserRole) => role === "admin",
  canViewAllTeams: (role: UserRole) => role === "super_admin",
  canManageTeamMembers: (role: UserRole) => role === "admin",
  canInviteMembers: (role: UserRole) => role === "admin",

  // Admin settings permissions (super_admin only)
  canAccessAdminSettings: (role: UserRole) => role === "super_admin",
  canManageUsers: (role: UserRole) => role === "super_admin",
  canManageHolidays: (role: UserRole) => ["super_admin", "admin"].includes(role), // Admin can manage holidays for their team

  // Leave permissions
  canApproveLeave: (role: UserRole) => role === "admin",
  canViewAllLeaves: (role: UserRole) => role === "super_admin",
  canViewTeamLeaves: (role: UserRole) => ["super_admin", "admin"].includes(role),
};

/**
 * Path-based access control mapping
 * Defines which roles can access which paths
 */
export const PathAccess: Record<string, UserRole[]> = {
  // Super Admin paths (system oversight)
  "/super-admin": ["super_admin"],
  "/super-admin/organizations": ["super_admin"],
  "/super-admin/subscriptions": ["super_admin"],
  "/super-admin/reports": ["super_admin"],

  // Admin paths (team management) - admin = old leader, super_admin can view
  "/team": ["super_admin", "admin"],
  "/team/members": ["super_admin", "admin"],
  "/team/leaves": ["super_admin", "admin"],
  "/team/calendar": ["super_admin", "admin"],
  "/team/timesheets": ["super_admin", "admin"],
  "/admin/teams": ["super_admin", "admin"],

  // Settings paths
  "/settings/billing": ["admin"], // Only admins (team owners) have billing
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
