import type { NextRequest } from "next/server";

// Admin endpoints require ADMIN_TOKEN in production. In local dev with no token
// configured they're open so the review queue can be tried out.
export function isAdmin(req: NextRequest): boolean {
  const token = process.env.ADMIN_TOKEN;
  if (!token) return process.env.NODE_ENV !== "production";
  return req.headers.get("x-admin-token") === token;
}
