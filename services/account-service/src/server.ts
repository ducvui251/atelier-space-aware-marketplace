import { createServiceServer, getPort, readJson, writeServiceError, writeServiceJson, type ServiceRouteHandler } from "@atelier/config/http";
import { AccountSyncRequestSchema, AccountUpdateRequestSchema, parseBody } from "@atelier/contracts";
import { ping } from "@atelier/persistence";
import { health } from "./health.ts";
import { findByAuthUserId, syncAuthUser, updateProfile } from "./infrastructure/account-repository.ts";

const routes: Record<string, ServiceRouteHandler> = {
  "GET /v1/account/me": async ({ url, response, correlationId }) => {
    const authUserId = url.searchParams.get("authUserId");
    if (!authUserId) return writeServiceError(response, 400, { code: "VALIDATION_ERROR", message: "authUserId is required", correlationId, field: "authUserId" });
    const user = await findByAuthUserId(authUserId, correlationId);
    if (!user) return writeServiceError(response, 404, { code: "NOT_FOUND", message: "Account not found", correlationId });
    return writeServiceJson(response, 200, { user }, correlationId);
  },
  "POST /v1/account/users/sync": async ({ request, response, correlationId }) => {
    const parsed = parseBody(AccountSyncRequestSchema, await readJson(request));
    if (!parsed.success) return writeServiceError(response, 400, { code: parsed.code, message: parsed.message, correlationId, field: parsed.field });
    const user = await syncAuthUser(parsed.data, correlationId);
    return writeServiceJson(response, 200, { user }, correlationId);
  },
  "PATCH /v1/account/me": async ({ request, url, response, correlationId }) => {
    const authUserId = url.searchParams.get("authUserId");
    if (!authUserId) return writeServiceError(response, 400, { code: "VALIDATION_ERROR", message: "authUserId is required", correlationId, field: "authUserId" });
    const parsed = parseBody(AccountUpdateRequestSchema, await readJson(request));
    if (!parsed.success) return writeServiceError(response, 400, { code: parsed.code, message: parsed.message, correlationId, field: parsed.field });
    const user = await updateProfile(authUserId, parsed.data, correlationId);
    if (!user) return writeServiceError(response, 404, { code: "NOT_FOUND", message: "Account not found", correlationId });
    return writeServiceJson(response, 200, { user }, correlationId);
  },
};

async function ready() {
  const database = (await ping()) ? ("ok" as const) : ("unavailable" as const);
  return { status: database, dependencies: { database } };
}

createServiceServer({ name: "account", version: "v1", health, ready, routes, internalToken: process.env.ATELIER_INTERNAL_SERVICE_TOKEN }).listen(getPort("ACCOUNT_PORT", 4101));
