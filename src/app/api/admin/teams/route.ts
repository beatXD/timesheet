import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { Team, User } from "@/models";

// GET /api/admin/teams - List all teams
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectDB();

    const teams = await Team.find()
      .populate("leaderId", "name email")
      .populate("memberIds", "name email")
      .populate("projectId", "name")
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ data: teams });
  } catch (error) {
    console.error("Error fetching teams:", error);
    return NextResponse.json(
      { error: "Failed to fetch teams" },
      { status: 500 }
    );
  }
}

// POST /api/admin/teams - Create team
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectDB();

    const body = await request.json();
    const { name, leaderId, memberIds, projectId } = body;

    if (!name || !leaderId) {
      return NextResponse.json(
        { error: "Name and leader are required" },
        { status: 400 }
      );
    }

    const team = await Team.create({
      name,
      leaderId,
      memberIds: memberIds || [],
      projectId,
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

// PUT /api/admin/teams - Update team
export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectDB();

    const body = await request.json();
    const { _id, name, leaderId, memberIds, projectId } = body;

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

    const oldLeaderId = oldTeam.leaderId?.toString();
    const oldMemberIds = oldTeam.memberIds.map((id: { toString: () => string }) => id.toString());
    const newMemberIds = memberIds || [];

    // Find removed and added members
    const removedMembers = oldMemberIds.filter((id: string) => !newMemberIds.includes(id));
    const addedMembers = newMemberIds.filter((id: string) => !oldMemberIds.includes(id));

    // Update team
    const team = await Team.findByIdAndUpdate(
      _id,
      { name, leaderId, memberIds, projectId },
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

// DELETE /api/admin/teams - Delete team
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "admin") {
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
