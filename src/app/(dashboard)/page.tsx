import { getCurrentUser } from "@/lib/auth-utils";
import { Greeting } from "@/components/dashboard/greeting";
import { ScheduleWidget } from "@/components/dashboard/schedule-widget";
import { SupplementsWidget } from "@/components/dashboard/supplements-widget";
import { GymWidget } from "@/components/dashboard/gym-widget";
import { TodoWidget } from "@/components/dashboard/todo-widget";
import { FinanceWidget } from "@/components/dashboard/finance-widget";
import { WeatherWidget } from "@/components/dashboard/weather-widget";
import { AISummaryWidget } from "@/components/dashboard/ai-summary-widget";

export default async function HomePage() {
  const user = await getCurrentUser();

  return (
    <>
      <Greeting name={user?.name ?? user?.email?.split("@")[0]} />

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        <WeatherWidget delay={0.05} />
        <ScheduleWidget delay={0.1} />
        <TodoWidget delay={0.15} />
        <SupplementsWidget delay={0.2} />
        <GymWidget delay={0.25} />
        <FinanceWidget delay={0.3} />
        <AISummaryWidget delay={0.35} />
      </div>
    </>
  );
}
