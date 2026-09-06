import { createServiceServer, getPort, readJson, writeServiceJson, type ServiceRouteHandler } from "@atelier/config/http";
import { health } from "./health.ts";
import { findByAuthUserId, syncAuthUser, updateProfile } from "./infrastructure/account-repository.ts";

const routes: Record<string, ServiceRouteHandler> = {
  "GET /v1/account/me": async ({ url, response, correlationId }) => {
    const authUserId = url.searchParams.get("authUserId");
    if (!authUserId) return writeServiceJson(response, 400, { error: "authUserId is required" }, correlationId);
    const user = await findByAuthUserId(authUserId);
    if (!user) return writeServiceJson(response, 404, { error: "Account not found" }, correlationId);
    return writeServiceJson(response, 200, { user }, correlationId);
  },
  "POST /v1/account/users/sync": async ({ request, response, correlationId }) => {
    const body = await readJson<{ authUserId?: string; email?: string; fullName?: string; phone?: string }>(request);
    if (!body?.authUserId || !body.email) return writeServiceJson(response, 400, { error: "authUserId and email are required" }, correlationId);
    const user = await syncAuthUser({ ...body, authUserId: body.authUserId, email: body.email });
    return writeServiceJson(response, 200, { user }, correlationId);
  },
  "PATCH /v1/account/me": async ({ request, url, response, correlationId }) => {
    const authUserId = url.searchParams.get("authUserId");
    const body = await readJson<{ fullName?: string; phone?: string }>(request);
    if (!authUserId || !body?.fullName?.trim()) return writeServiceJson(response, 400, { error: "authUserId and fullName are required" }, correlationId);
    const user = await updateProfile(authUserId, { fullName: body.fullName.trim(), phone: body.phone });
    if (!user) return writeServiceJson(response, 404, { error: "Account not found" }, correlationId);
    return writeServiceJson(response, 200, { user }, correlationId);
  },
};

createServiceServer({ name: "account", version: "v1", health, routes, internalToken: process.env.ATELIER_INTERNAL_SERVICE_TOKEN }).listen(getPort("ACCOUNT_PORT", 4101));
