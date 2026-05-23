import { getCurrentUser } from "@/lib/auth-utils";
import { Greeting } from "@/components/dashboard/greeting";
import { ScheduleWidget } from "@/components/dashboard/schedule-widget";
import { SupplementsWidget } from "@/components/dashboard/supplements-widget";
import { GymWidget } from "@/components/dashboard/gym-widget";
import { TodoWidget } from "@/components/dashboard/todo-widget";
import { FinanceWidget } from "@/components/dashboard/finance-widget";

export default async function HomePage() {
  const user = await getCurrentUser();

  return (
    <>
      <Greeting name={user?.name ?? user?.email?.split("@")[0]} />

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        <ScheduleWidget delay={0.05} />
        <TodoWidget delay={0.1} />
        <SupplementsWidget delay={0.15} />
        <GymWidget delay={0.2} />
        <FinanceWidget delay={0.25} />
      </div>
    </>
  );
}
