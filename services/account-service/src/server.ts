import { createServiceServer, getPort, readJson, writeServiceError, writeServiceJson, type ServiceRouteHandler } from "@atelier/config/http";
import { verifyPrincipal } from "@atelier/config/principal";
import { AccountSyncRequestSchema, AccountUpdateRequestSchema, parseBody } from "@atelier/contracts";
import { ping } from "@atelier/persistence";
import { health } from "./health.ts";
import { findByAuthUserId, syncAuthUser, updateProfile } from "./infrastructure/account-repository.ts";

/**
 * The caller's own identity, verified from the signed `x-principal` header
 * the Gateway attaches after validating the Supabase session (G-19) — never
 * a plain caller-supplied value, since that would let anyone holding the
 * shared internal-service token impersonate any user.
 */
function requirePrincipal(request: import("node:http").IncomingMessage): string | null {
  const header = request.headers["x-principal"];
  return verifyPrincipal(Array.isArray(header) ? header[0] : header);
}

const routes: Record<string, ServiceRouteHandler> = {
  "GET /v1/account/me": async ({ request, response, correlationId }) => {
    const authUserId = requirePrincipal(request);
    if (!authUserId) return writeServiceError(response, 401, { code: "UNAUTHORIZED", message: "A valid signed principal is required", correlationId, retryable: false });
    const user = await findByAuthUserId(authUserId, correlationId);
    if (!user) return writeServiceError(response, 404, { code: "NOT_FOUND", message: "Account not found", correlationId, retryable: false });
    return writeServiceJson(response, 200, { user }, correlationId);
  },
  "POST /v1/account/users/sync": async ({ request, response, correlationId }) => {
    const parsed = parseBody(AccountSyncRequestSchema, await readJson(request));
    if (!parsed.success) return writeServiceError(response, 400, { code: parsed.code, message: parsed.message, correlationId, field: parsed.field, retryable: false });
    const user = await syncAuthUser(parsed.data, correlationId);
    return writeServiceJson(response, 200, { user }, correlationId);
  },
  "PATCH /v1/account/me": async ({ request, response, correlationId }) => {
    const authUserId = requirePrincipal(request);
    if (!authUserId) return writeServiceError(response, 401, { code: "UNAUTHORIZED", message: "A valid signed principal is required", correlationId, retryable: false });
    const parsed = parseBody(AccountUpdateRequestSchema, await readJson(request));
    if (!parsed.success) return writeServiceError(response, 400, { code: parsed.code, message: parsed.message, correlationId, field: parsed.field, retryable: false });
    const user = await updateProfile(authUserId, parsed.data, correlationId);
    if (!user) return writeServiceError(response, 404, { code: "NOT_FOUND", message: "Account not found", correlationId, retryable: false });
    return writeServiceJson(response, 200, { user }, correlationId);
  },
};

async function ready() {
  const database = (await ping()) ? ("ok" as const) : ("unavailable" as const);
  return { status: database, dependencies: { database } };
}

createServiceServer({ name: "account", version: "v1", health, ready, routes, internalToken: process.env.ATELIER_INTERNAL_SERVICE_TOKEN }).listen(getPort("ACCOUNT_PORT", 4101));
