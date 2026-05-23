"use client";

import { signIn } from "next-auth/react";
import { Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ConnectGoogle({ inline = false }: { inline?: boolean }) {
  if (inline) {
    return (
      <Button variant="glass" size="sm" onClick={() => signIn("google")} className="gap-2">
        <Calendar className="h-3.5 w-3.5" />
        Connect Google Calendar
      </Button>
    );
  }
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 ring-1 ring-emerald-500/20">
        <Calendar className="h-6 w-6 text-emerald-400" strokeWidth={1.75} />
      </div>
      <h3 className="text-xl font-medium text-white">Connect Google Calendar</h3>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        Sign in with Google to sync your events and to-dos. You'll be able to create, edit, and complete them from here.
      </p>
      <Button onClick={() => signIn("google")} className="mt-6 gap-2">
        <Calendar className="h-4 w-4" />
        Connect with Google
      </Button>
    </div>
  );
}
