import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { Team, User, Timesheet, LeaveRequest } from "@/models";

// GET /api/admin/teams - List teams (admin sees all, leader sees their teams)
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user || !["admin", "leader"].includes(session.user.role || "")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectDB();

    // Admin sees all teams, leader sees only teams they lead
    const query = session.user.role === "admin"
      ? {}
      : { leaderId: session.user.id };

    const teams = await Team.find(query)
      .populate("leaderId", "_id name email")
      .populate("memberIds", "_id name email")
      .sort({ createdAt: -1 })
      .lean();

    // Convert ObjectIds to strings for consistent comparison
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const serializedTeams = teams.map((team: any) => ({
      ...team,
      _id: team._id?.toString(),
      leaderId: team.leaderId ? {
        ...team.leaderId,
        _id: team.leaderId._id?.toString(),
      } : null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      memberIds: (team.memberIds || []).map((m: any) => ({
        ...m,
        _id: m._id?.toString(),
      })),
    }));

    return NextResponse.json({ data: serializedTeams });
  } catch (error) {
    console.error("Error fetching teams:", error);
    return NextResponse.json(
      { error: "Failed to fetch teams" },
      { status: 500 }
    );
  }
}

// POST /api/admin/teams - Create team (admin can create any, leader can only create teams they lead)
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || !["admin", "leader"].includes(session.user.role || "")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectDB();

    const body = await request.json();
    const { name, leaderId, memberIds } = body;

    if (!name || !leaderId) {
      return NextResponse.json(
        { error: "Name and leader are required" },
        { status: 400 }
      );
    }

    // Leader can only create teams where they are the leader
    if (session.user.role === "leader" && leaderId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Check for duplicate team name
    const existingTeam = await Team.findOne({ name });
    if (existingTeam) {
      return NextResponse.json(
        { error: "A team with this name already exists" },
        { status: 400 }
      );
    }

    const team = await Team.create({
      name,
      leaderId,
      memberIds: memberIds || [],
    });

    // Add team to leader's teamIds
    await User.findByIdAndUpdate(leaderId, { $addToSet: { teamIds: team._id } });

    // Add team to members' teamIds
    if (memberIds && memberIds.length > 0) {
      await User.updateMany(
        { _id: { $in: memberIds } },
        { $addToSet: { teamIds: team._id } }
      );
    }

    return NextResponse.json({ data: team }, { status: 201 });
  } catch (error) {
    console.error("Error creating team:", error);
    return NextResponse.json(
      { error: "Failed to create team" },
      { status: 500 }
    );
  }
}

// PUT /api/admin/teams - Update team (admin can update any, leader can only update teams they lead)
export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || !["admin", "leader"].includes(session.user.role || "")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectDB();

    const body = await request.json();
    const { _id, name, leaderId, memberIds } = body;

    if (!_id) {
      return NextResponse.json(
        { error: "Team ID is required" },
        { status: 400 }
      );
    }

    // Get old team to compare members
    const oldTeam = await Team.findById(_id);
    if (!oldTeam) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    // Leader can only update teams they lead
    if (session.user.role === "leader" && oldTeam.leaderId?.toString() !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Leader cannot change the leader to someone else
    if (session.user.role === "leader" && leaderId && leaderId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Check for duplicate team name (if name is being changed)
    if (name && name !== oldTeam.name) {
      const existingTeam = await Team.findOne({ name, _id: { $ne: _id } });
      if (existingTeam) {
        return NextResponse.json(
          { error: "A team with this name already exists" },
          { status: 400 }
        );
      }
    }

    const oldLeaderId = oldTeam.leaderId?.toString();
    const oldMemberIds = oldTeam.memberIds.map((id: { toString: () => string }) => id.toString());
    const newMemberIds = memberIds || [];

    // Find removed and added members
    const removedMembers = oldMemberIds.filter((id: string) => !newMemberIds.includes(id));
    const addedMembers = newMemberIds.filter((id: string) => !oldMemberIds.includes(id));

    // Update team
    const team = await Team.findByIdAndUpdate(
      _id,
      { name, leaderId, memberIds },
      { new: true }
    );

    // Handle leader change
    if (oldLeaderId !== leaderId) {
      // Remove team from old leader's teamIds
      if (oldLeaderId) {
        await User.findByIdAndUpdate(oldLeaderId, { $pull: { teamIds: _id } });
      }
      // Add team to new leader's teamIds
      if (leaderId) {
        await User.findByIdAndUpdate(leaderId, { $addToSet: { teamIds: _id } });
      }
    }

    // Remove team from removed members' teamIds
    if (removedMembers.length > 0) {
      await User.updateMany(
        { _id: { $in: removedMembers } },
        { $pull: { teamIds: _id } }
      );
    }

    // Add team to added members' teamIds
    if (addedMembers.length > 0) {
      await User.updateMany(
        { _id: { $in: addedMembers } },
        { $addToSet: { teamIds: _id } }
      );
    }

    return NextResponse.json({ data: team });
  } catch (error) {
    console.error("Error updating team:", error);
    return NextResponse.json(
      { error: "Failed to update team" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/teams - Delete team (admin can delete any, leader can only delete teams they lead)
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || !["admin", "leader"].includes(session.user.role || "")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Team ID is required" },
        { status: 400 }
      );
    }

    // Get team to check members
    const team = await Team.findById(id);
    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    // Leader can only delete teams they lead
    if (session.user.role === "leader" && team.leaderId?.toString() !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get all member IDs including leader
    const allMemberIds = [
      team.leaderId?.toString(),
      ...team.memberIds.map((m: { toString: () => string }) => m.toString()),
    ].filter(Boolean);

    // Check for pending/submitted timesheets from team members
    const pendingTimesheets = await Timesheet.countDocuments({
      userId: { $in: allMemberIds },
      status: { $in: ["submitted", "approved"] },
    });

    if (pendingTimesheets > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete team: ${pendingTimesheets} timesheet(s) are pending approval. Please complete all pending approvals first.`,
        },
        { status: 400 }
      );
    }

    // Check for pending leave requests from team members
    const pendingLeaves = await LeaveRequest.countDocuments({
      userId: { $in: allMemberIds },
      status: "pending",
    });

    if (pendingLeaves > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete team: ${pendingLeaves} leave request(s) are pending approval. Please complete all pending approvals first.`,
        },
        { status: 400 }
      );
    }

    // Remove team from all users' teamIds
    await User.updateMany(
      { teamIds: id },
      { $pull: { teamIds: id } }
    );

    await Team.findByIdAndDelete(id);

    return NextResponse.json({ message: "Team deleted" });
  } catch (error) {
    console.error("Error deleting team:", error);
    return NextResponse.json(
      { error: "Failed to delete team" },
      { status: 500 }
    );
  }
}
