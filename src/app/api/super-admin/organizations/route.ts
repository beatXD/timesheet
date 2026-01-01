import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import Team from "@/models/Team";
import { Permissions } from "@/lib/permissions";

// GET /api/super-admin/organizations - Get all organizations (admins with their teams)
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!Permissions.canAccessSuperAdmin(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectDB();

    // Get all admins with their subscription info
    const admins = await User.find({ role: "admin" })
      .select("name email image subscription createdAt")
      .lean();

    // Get all teams with their members
    const teams = await Team.find()
      .populate("adminId", "name email")
      .populate("memberIds", "name email image")
      .lean();

    // Map admins to their teams
    const organizations = admins.map((admin) => {
      const adminTeams = teams.filter(
        (team) => team.adminId?._id?.toString() === admin._id.toString()
      );

      const totalMembers = adminTeams.reduce(
        (sum, team) => sum + (team.memberIds?.length || 0),
        0
      );

      return {
        admin: {
          _id: admin._id,
          name: admin.name,
          email: admin.email,
          image: admin.image,
          createdAt: admin.createdAt,
        },
        subscription: admin.subscription || {
          plan: "free",
          status: "active",
          maxUsers: 1,
          maxTeams: 1,
        },
        teams: adminTeams.map((team) => ({
          _id: team._id,
          name: team.name,
          memberCount: team.memberIds?.length || 0,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          members: team.memberIds?.map((member: any) => ({
            _id: member._id,
            name: member.name,
            email: member.email,
            image: member.image,
          })),
        })),
        stats: {
          teamCount: adminTeams.length,
          memberCount: totalMembers,
        },
      };
    });

    return NextResponse.json({ data: organizations });
  } catch (error) {
    console.error("Get organizations error:", error);
    return NextResponse.json(
      { error: "Failed to get organizations" },
      { status: 500 }
    );
  }
}
