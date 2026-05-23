import { redirect } from "next/navigation";
import { TopNav } from "@/components/layout/top-nav";
import { MobileTabBar } from "@/components/layout/mobile-tab-bar";
import { getCurrentUser } from "@/lib/auth-utils";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="relative min-h-screen">
      <TopNav />
      <main className="mx-auto w-full max-w-7xl px-4 pb-24 pt-8 md:pb-12">
        {children}
      </main>
      <MobileTabBar />
    </div>
  );
}
