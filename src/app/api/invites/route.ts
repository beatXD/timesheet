import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import Team from "@/models/Team";
import Invite from "@/models/Invite";
import { Permissions } from "@/lib/permissions";
import { nanoid } from "nanoid";

// GET /api/invites - List invites for admin's team
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!Permissions.canInviteMembers(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectDB();

    // Get admin's teams
    const teams = await Team.find({ adminId: session.user.id });
    const teamIds = teams.map((t) => t._id);

    // Get invites for those teams
    const invites = await Invite.find({ teamId: { $in: teamIds } })
      .populate("teamId", "name")
      .sort({ createdAt: -1 });

    return NextResponse.json({
      data: invites.map((invite) => ({
        _id: invite._id,
        token: invite.token,
        teamId: invite.teamId._id,
        teamName: (invite.teamId as unknown as { name: string }).name,
        expiresAt: invite.expiresAt,
        maxUses: invite.maxUses,
        usedCount: invite.usedCount,
        isExpired: new Date() > invite.expiresAt,
        createdAt: invite.createdAt,
      })),
    });
  } catch (error) {
    console.error("Get invites error:", error);
    return NextResponse.json(
      { error: "Failed to get invites" },
      { status: 500 }
    );
  }
}

// POST /api/invites - Create new invite
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!Permissions.canInviteMembers(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { teamId } = body;

    await connectDB();

    // Verify admin owns this team
    const team = await Team.findOne({
      _id: teamId,
      adminId: session.user.id,
    });

    if (!team) {
      return NextResponse.json(
        { error: "Team not found or unauthorized" },
        { status: 404 }
      );
    }

    // Check subscription limits
    const admin = await User.findById(session.user.id);
    if (!admin) {
      return NextResponse.json({ error: "Admin not found" }, { status: 404 });
    }

    const maxUsers = admin.subscription?.maxUsers || 1;
    const currentMemberCount = team.memberIds?.length || 0;
    const remainingSlots = maxUsers - 1 - currentMemberCount; // -1 for admin

    if (remainingSlots <= 0) {
      return NextResponse.json(
        { error: "Team has reached maximum member limit" },
        { status: 400 }
      );
    }

    // Generate invite token
    const token = nanoid(21);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const invite = await Invite.create({
      teamId: team._id,
      adminId: session.user.id,
      token,
      expiresAt,
      maxUses: remainingSlots,
      usedCount: 0,
    });

    const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/invite/${token}`;

    return NextResponse.json({
      success: true,
      data: {
        _id: invite._id,
        token: invite.token,
        inviteUrl,
        expiresAt: invite.expiresAt,
        maxUses: invite.maxUses,
      },
    });
  } catch (error) {
    console.error("Create invite error:", error);
    return NextResponse.json(
      { error: "Failed to create invite" },
      { status: 500 }
    );
  }
}

// DELETE /api/invites - Delete an invite
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!Permissions.canInviteMembers(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const inviteId = searchParams.get("id");

    if (!inviteId) {
      return NextResponse.json(
        { error: "Invite ID required" },
        { status: 400 }
      );
    }

    await connectDB();

    // Verify admin owns this invite
    const invite = await Invite.findOne({
      _id: inviteId,
      adminId: session.user.id,
    });

    if (!invite) {
      return NextResponse.json(
        { error: "Invite not found or unauthorized" },
        { status: 404 }
      );
    }

    await Invite.deleteOne({ _id: inviteId });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete invite error:", error);
    return NextResponse.json(
      { error: "Failed to delete invite" },
      { status: 500 }
    );
  }
}
