import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { User, Team, Invite } from "@/models";
import { nanoid } from "nanoid";

// POST /api/team/members/add-by-email
// Add member by email or generate invite if user doesn't exist
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectDB();

    const body = await request.json();
    const { teamId, email } = body;

    if (!teamId || !email) {
      return NextResponse.json(
        { error: "Team ID and email are required" },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    // Check if team exists and user is the admin
    const team = await Team.findById(teamId);
    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    if (team.adminId?.toString() !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Check subscription member limit
    const currentUser = await User.findById(session.user.id);
    const maxUsers = currentUser?.subscription?.maxUsers || 1;
    const currentMemberCount = team.memberIds.length + 1; // +1 for admin

    if (currentMemberCount >= maxUsers) {
      return NextResponse.json(
        { error: `Member limit reached. Your plan allows ${maxUsers} user(s). Please upgrade to add more members.` },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase();

    // Check if there's already a pending invite for this email and team
    const existingInvite = await Invite.findOne({
      teamId: team._id,
      email: normalizedEmail,
      expiresAt: { $gt: new Date() },
      $expr: { $lt: ["$usedCount", "$maxUses"] },
    });

    if (existingInvite) {
      return NextResponse.json(
        { error: "An invitation has already been sent to this email" },
        { status: 400 }
      );
    }

    // Check if user with this email exists
    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser) {
      // User exists - check if already in team
      const isAlreadyMember =
        team.adminId?.toString() === existingUser._id.toString() ||
        team.memberIds.some((id: { toString: () => string }) => id.toString() === existingUser._id.toString());

      if (isAlreadyMember) {
        return NextResponse.json(
          { error: "User is already a member of this team" },
          { status: 400 }
        );
      }

      // Add user to team directly
      team.memberIds.push(existingUser._id);
      await team.save();

      // Add team to user's teamIds
      await User.findByIdAndUpdate(existingUser._id, {
        $addToSet: { teamIds: team._id },
        $set: { invitedBy: session.user.id },
      });

      return NextResponse.json({
        data: {
          status: "added",
          email: normalizedEmail,
          message: "User has been added to the team",
        },
      });
    } else {
      // User doesn't exist - create invite (will auto-join on registration)
      const token = nanoid(32);
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      await Invite.create({
        teamId: team._id,
        adminId: session.user.id,
        token,
        email: normalizedEmail,
        expiresAt,
        maxUses: 1,
        usedCount: 0,
      });

      return NextResponse.json({
        data: {
          status: "invited",
          email: normalizedEmail,
          message: "Invitation created. User will be added when they register.",
        },
      });
    }
  } catch (error) {
    console.error("Error adding member by email:", error);
    return NextResponse.json(
      { error: "Failed to add member" },
      { status: 500 }
    );
  }
}
