import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { ROUTES } from "../src/routes.ts";
import { SERVICE_NAMES } from "../src/index.ts";

/**
 * Regenerates openapi.json from the same Zod schemas the services validate
 * requests with (MICROSERVICE_100_PLAN.md Phase 3 — "must not be a manually
 * stale second source of truth"). Run via `pnpm --filter @atelier/contracts
 * openapi:generate` whenever a schema in src/v1.ts or a route in
 * src/routes.ts changes.
 */

const errorSchema = {
  type: "object",
  properties: {
    error: { type: "string", description: "Human-readable message (kept for backward compatibility with existing clients)" },
    code: { type: "string", description: "Machine-readable error code, e.g. VALIDATION_ERROR, NOT_FOUND, CONFLICT" },
    correlationId: { type: "string" },
    field: { type: "string", description: "Present for VALIDATION_ERROR: the offending request field" },
    retryable: { type: "boolean" },
  },
  required: ["error", "code", "correlationId"],
};

const statusDescriptions: Record<number, string> = {
  400: "Validation error",
  401: "Missing or invalid x-service-token",
  403: "Caller does not own this resource",
  404: "Resource not found",
  409: "Conflict with current resource state",
};

function toJsonSchema(schema: z.ZodType) {
  return z.toJSONSchema(schema, { target: "openapi-3.0" });
}

const paths: Record<string, Record<string, unknown>> = {};

for (const route of ROUTES) {
  const pathItem = (paths[route.path] ??= {});
  const parameters: unknown[] = [];
  let requestBody: unknown;

  if (route.requestSchema && route.requestLocation === "query") {
    const jsonSchema = toJsonSchema(route.requestSchema) as { properties?: Record<string, unknown>; required?: string[] };
    for (const [name, propSchema] of Object.entries(jsonSchema.properties ?? {})) {
      parameters.push({ name, in: "query", required: jsonSchema.required?.includes(name) ?? false, schema: propSchema });
    }
  } else if (route.requestSchema) {
    requestBody = {
      required: true,
      content: { "application/json": { schema: toJsonSchema(route.requestSchema) } },
    };
  }

  for (const match of route.path.matchAll(/\{(\w+)\}/g)) {
    parameters.push({ name: match[1], in: "path", required: true, schema: { type: "string" } });
  }

  const responses: Record<string, unknown> = {
    [route.successStatus]: { description: "Success" },
  };
  for (const status of route.errorStatuses) {
    responses[status] = {
      description: statusDescriptions[status] ?? "Error",
      content: { "application/json": { schema: { $ref: "#/components/schemas/ServiceError" } } },
    };
  }

  pathItem[route.method.toLowerCase()] = {
    summary: route.summary,
    tags: [route.service],
    security: route.auth === "internal" ? [{ serviceToken: [] }] : [],
    ...(parameters.length ? { parameters } : {}),
    ...(requestBody ? { requestBody } : {}),
    responses,
  };
}

const document = {
  openapi: "3.0.3",
  info: {
    title: "Atelier internal service contracts",
    version: "v1",
    description: "Generated from @atelier/contracts/src/v1.ts and src/routes.ts — do not hand-edit; run `pnpm openapi:generate`.",
  },
  servers: SERVICE_NAMES.map((name) => ({ url: `http://${name}-service:PORT`, description: name })),
  components: {
    securitySchemes: {
      serviceToken: { type: "apiKey", in: "header", name: "x-service-token" },
    },
    schemas: {
      ServiceError: errorSchema,
    },
  },
  paths,
};

const outPath = fileURLToPath(new URL("../openapi.json", import.meta.url));
writeFileSync(outPath, `${JSON.stringify(document, null, 2)}\n`);
console.log(`Wrote ${outPath} (${ROUTES.length} routes)`);
