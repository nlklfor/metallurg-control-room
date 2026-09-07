import { redirect } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { PageTransition } from "@/components/PageTransition";
import { checkAdmin } from "@/lib/supabase/server";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isAdmin } = await checkAdmin();

  if (!user || !isAdmin) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen bg-white">
      <Sidebar userEmail={user.email ?? null} />
      <main className="min-h-screen flex-1 bg-white px-3 pb-4 pt-16 lg:ml-[220px] lg:px-8 lg:pb-8 lg:pt-8">
        <PageTransition>{children}</PageTransition>
      </main>
    </div>
  );
}