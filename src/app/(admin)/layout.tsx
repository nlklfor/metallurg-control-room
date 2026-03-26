import { redirect } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { PageTransition } from "@/components/PageTransition";
import { createClient } from "@/lib/supabase/server";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const adminEmail = process.env.ADMIN_EMAIL;
  if (adminEmail && user.email !== adminEmail) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen bg-white">
      <Sidebar userEmail={user.email ?? null} />
      <main className="ml-[220px] min-h-screen flex-1 bg-white p-8">
        <PageTransition>{children}</PageTransition>
      </main>
    </div>
  );
}
