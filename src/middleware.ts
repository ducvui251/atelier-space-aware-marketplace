import { NextResponse, type NextRequest } from "next/server";

/**
 * Permissive CORS for the mock REST API only, so the OpenAPI spec in
 * `api-docs/openapi.json` can be tested from an external tool (e.g.
 * editor.swagger.io, Postman) against this local dev server without the
 * browser blocking the cross-origin request.
 */
function corsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}

export function middleware(request: NextRequest) {
  if (request.method === "OPTIONS") {
    return new NextResponse(null, { status: 204, headers: corsHeaders() });
  }

  const response = NextResponse.next();
  for (const [key, value] of Object.entries(corsHeaders())) {
    response.headers.set(key, value);
  }
  return response;
}

export const config = {
  matcher: "/api/:path*",
};
