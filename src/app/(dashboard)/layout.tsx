import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { Header } from "@/components/Header";
import { Toaster } from "@/components/ui/sonner";
import type { UserRole } from "@/types";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const user = {
    name: session.user.name || "User",
    email: session.user.email || "",
    image: session.user.image || undefined,
    role: (session.user.role || "user") as UserRole,
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar userRole={user.role} />
      <div className="transition-all duration-300 ml-64 bg-background">
        <Header user={user} />
        <main className="p-6 mt-16">{children}</main>
      </div>
      <Toaster position="top-right" />
    </div>
  );
}
