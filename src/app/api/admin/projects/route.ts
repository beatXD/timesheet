import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { Project, Team } from "@/models";

// GET /api/admin/projects - List projects (admin sees all, leader sees projects used by their teams)
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user || !["admin", "leader"].includes(session.user.role || "")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectDB();

    let projects;
    if (session.user.role === "admin") {
      // Admin sees all projects
      projects = await Project.find().sort({ createdAt: -1 }).lean();
    } else {
      // Leader sees only projects used by their teams
      const leaderTeams = await Team.find({ leaderId: session.user.id }).select("projectId").lean();
      const projectIds = leaderTeams
        .map((t) => t.projectId)
        .filter((id): id is NonNullable<typeof id> => id != null);
      projects = await Project.find({ _id: { $in: projectIds } })
        .sort({ createdAt: -1 })
        .lean();
    }

    return NextResponse.json({ data: projects });
  } catch (error) {
    console.error("Error fetching projects:", error);
    return NextResponse.json(
      { error: "Failed to fetch projects" },
      { status: 500 }
    );
  }
}

// POST /api/admin/projects - Create project (admin and leader)
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || !["admin", "leader"].includes(session.user.role || "")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectDB();

    const body = await request.json();
    const { name, description } = body;

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const project = await Project.create({
      name,
      description,
    });

    return NextResponse.json({ data: project }, { status: 201 });
  } catch (error) {
    console.error("Error creating project:", error);
    return NextResponse.json(
      { error: "Failed to create project" },
      { status: 500 }
    );
  }
}

// PUT /api/admin/projects - Update project (admin can update any, leader can only update their team's projects)
export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || !["admin", "leader"].includes(session.user.role || "")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectDB();

    const body = await request.json();
    const { _id, name, description } = body;

    if (!_id) {
      return NextResponse.json(
        { error: "Project ID is required" },
        { status: 400 }
      );
    }

    // Leader can only update projects used by their teams
    if (session.user.role === "leader") {
      const leaderTeam = await Team.findOne({ leaderId: session.user.id, projectId: _id });
      if (!leaderTeam) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const project = await Project.findByIdAndUpdate(
      _id,
      { name, description },
      { new: true }
    );

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    return NextResponse.json({ data: project });
  } catch (error) {
    console.error("Error updating project:", error);
    return NextResponse.json(
      { error: "Failed to update project" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/projects - Delete project (admin can delete any, leader can only delete their team's projects)
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
        { error: "Project ID is required" },
        { status: 400 }
      );
    }

    // Leader can only delete projects used by their teams
    if (session.user.role === "leader") {
      const leaderTeam = await Team.findOne({ leaderId: session.user.id, projectId: id });
      if (!leaderTeam) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    // Check if project is being used by any teams
    const teamsUsingProject = await Team.countDocuments({ projectId: id });
    if (teamsUsingProject > 0) {
      return NextResponse.json(
        { error: `Cannot delete project. It is being used by ${teamsUsingProject} team(s).` },
        { status: 400 }
      );
    }

    await Project.findByIdAndDelete(id);

    return NextResponse.json({ message: "Project deleted" });
  } catch (error) {
    console.error("Error deleting project:", error);
    return NextResponse.json(
      { error: "Failed to delete project" },
      { status: 500 }
    );
  }
}
