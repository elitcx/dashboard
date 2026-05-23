import { getServerSession } from "next-auth";
import { authOptions } from "./auth";

export async function getCurrentUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  return session.user as { id: string; email: string; name?: string | null };
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user?.id) throw new Error("UNAUTHORIZED");
  return user;
}
