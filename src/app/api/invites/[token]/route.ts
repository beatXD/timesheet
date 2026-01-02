import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import Team from "@/models/Team";
import Invite from "@/models/Invite";

interface RouteParams {
  params: Promise<{ token: string }>;
}

// GET /api/invites/[token] - Validate invite token
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { token } = await params;

    await connectDB();

    const invite = await Invite.findOne({ token })
      .populate("teamId", "name")
      .populate("adminId", "name email");

    if (!invite) {
      return NextResponse.json(
        { error: "Invite not found" },
        { status: 404 }
      );
    }

    // Check if expired
    if (new Date() > invite.expiresAt) {
      return NextResponse.json(
        { error: "Invite has expired" },
        { status: 410 }
      );
    }

    // Check if max uses reached
    if (invite.usedCount >= invite.maxUses) {
      return NextResponse.json(
        { error: "Invite has reached maximum uses" },
        { status: 410 }
      );
    }

    const team = invite.teamId as unknown as { _id: string; name: string };
    const admin = invite.adminId as unknown as { _id: string; name: string; email: string };

    return NextResponse.json({
      data: {
        token: invite.token,
        teamName: team.name,
        teamId: team._id,
        adminName: admin.name,
        expiresAt: invite.expiresAt,
        remainingUses: invite.maxUses - invite.usedCount,
      },
    });
  } catch (error) {
    console.error("Validate invite error:", error);
    return NextResponse.json(
      { error: "Failed to validate invite" },
      { status: 500 }
    );
  }
}

// POST /api/invites/[token] - Accept invite and join team
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { token } = await params;

    await connectDB();

    const invite = await Invite.findOne({ token });

    if (!invite) {
      return NextResponse.json(
        { error: "Invite not found" },
        { status: 404 }
      );
    }

    // Check if expired
    if (new Date() > invite.expiresAt) {
      return NextResponse.json(
        { error: "Invite has expired" },
        { status: 410 }
      );
    }

    // Check if max uses reached
    if (invite.usedCount >= invite.maxUses) {
      return NextResponse.json(
        { error: "Invite has reached maximum uses" },
        { status: 410 }
      );
    }

    // Get user
    const user = await User.findById(session.user.id);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get the team
    const team = await Team.findById(invite.teamId);
    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    // Check if user is already in this team
    if (team.memberIds?.some((id: { toString: () => string }) => id.toString() === user._id.toString())) {
      return NextResponse.json(
        { error: "You are already a member of this team" },
        { status: 400 }
      );
    }

    // Add user to team
    team.memberIds = team.memberIds || [];
    team.memberIds.push(user._id);
    await team.save();

    // Update user's teamIds (add to existing, support multiple teams)
    user.teamIds = user.teamIds || [];
    if (!user.teamIds.some((id: { toString: () => string }) => id.toString() === team._id.toString())) {
      user.teamIds.push(team._id);
    }
    user.invitedBy = invite.adminId;

    // Clear user's own subscription - they now use admin's subscription
    user.subscription = undefined;
    await user.save();

    // Increment invite usage
    invite.usedCount += 1;
    await invite.save();

    return NextResponse.json({
      success: true,
      message: "Successfully joined team",
      data: {
        teamId: team._id,
        teamName: team.name,
      },
    });
  } catch (error) {
    console.error("Accept invite error:", error);
    return NextResponse.json(
      { error: "Failed to accept invite" },
      { status: 500 }
    );
  }
}
