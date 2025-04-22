// lib/adminGuard.ts
import { MiddlewareHandler } from "hono";

export const adminGuard: MiddlewareHandler = async (c, next) => {
  const pass =
    c.req.header("x-admin-pw") || (await c.req.formData()).get("adminPassword");
  if (pass !== process.env.ADMIN_PASSWORD) return c.text("Forbidden", 403);
  await next();
};
