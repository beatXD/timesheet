import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { Team, User } from "@/models";

// GET /api/team/members - Get leader's teams with members
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only leaders and admins can access
    if (!["leader", "admin"].includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectDB();

    // Get teams where user is leader
    const teams = await Team.find({ leaderId: session.user.id })
      .populate("memberIds", "name email image role")
      .populate("leaderId", "name email image role")
      .populate("projectId", "name")
      .lean();

    // Get available users (not in any of leader's teams)
    const teamMemberIds = teams.flatMap((t) =>
      t.memberIds.map((m: { _id: { toString: () => string } }) => m._id.toString())
    );

    const availableUsers = await User.find({
      _id: { $nin: [...teamMemberIds, session.user.id] },
      role: "user", // Only regular users can be added as team members
    })
      .select("name email image")
      .lean();

    return NextResponse.json({
      data: {
        teams,
        availableUsers,
      },
    });
  } catch (error) {
    console.error("Error fetching team members:", error);
    return NextResponse.json(
      { error: "Failed to fetch team members" },
      { status: 500 }
    );
  }
}

// PUT /api/team/members - Update team members (leader only)
export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!["leader", "admin"].includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectDB();

    const body = await request.json();
    const { teamId, memberIds } = body;

    if (!teamId) {
      return NextResponse.json(
        { error: "Team ID is required" },
        { status: 400 }
      );
    }

    // Verify the user is the leader of this team
    const team = await Team.findById(teamId);
    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    if (team.leaderId.toString() !== session.user.id && session.user.role !== "admin") {
      return NextResponse.json(
        { error: "You are not the leader of this team" },
        { status: 403 }
      );
    }

    const oldMemberIds = team.memberIds.map((id: { toString: () => string }) => id.toString());
    const newMemberIds = memberIds || [];

    // Find removed and added members
    const removedMembers = oldMemberIds.filter((id: string) => !newMemberIds.includes(id));
    const addedMembers = newMemberIds.filter((id: string) => !oldMemberIds.includes(id));

    // Update team members
    await Team.findByIdAndUpdate(teamId, { memberIds: newMemberIds });

    // Remove team from removed members' teamIds
    if (removedMembers.length > 0) {
      await User.updateMany(
        { _id: { $in: removedMembers } },
        { $pull: { teamIds: teamId } }
      );
    }

    // Add team to added members' teamIds
    if (addedMembers.length > 0) {
      await User.updateMany(
        { _id: { $in: addedMembers } },
        { $addToSet: { teamIds: teamId } }
      );
    }

    // Get updated team
    const updatedTeam = await Team.findById(teamId)
      .populate("memberIds", "name email image role")
      .populate("projectId", "name")
      .lean();

    return NextResponse.json({ data: updatedTeam });
  } catch (error) {
    console.error("Error updating team members:", error);
    return NextResponse.json(
      { error: "Failed to update team members" },
      { status: 500 }
    );
  }
}
