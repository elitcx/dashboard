export { default } from "next-auth/middleware";

export const config = {
  matcher: [
    /*
     * Protect all routes EXCEPT:
     * - /login, /register
     * - /api/auth/* (NextAuth endpoints)
     * - /api/register (account creation)
     * - Static files and Next internals
     */
    "/((?!login|register|api/auth|api/register|_next/static|_next/image|favicon.ico).*)",
  ],
};
