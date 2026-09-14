export type ReservationResponseResult =
  | { kind: "reserved"; reservationId: string }
  | { kind: "unavailable" }
  | { kind: "dependency-failure"; status: number; reason: "upstream-response" | "invalid-response" | "transport" };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export async function interpretReservationResponse(response: Response): Promise<ReservationResponseResult> {
  const body: unknown = await response.json().catch(() => null);

  if (response.status === 409 && isRecord(body) && body.code === "CONFLICT") {
    return { kind: "unavailable" };
  }

  if (!response.ok) {
    return { kind: "dependency-failure", status: response.status, reason: "upstream-response" };
  }

  if (!isRecord(body) || typeof body.id !== "string" || body.id.length === 0) {
    return { kind: "dependency-failure", status: 502, reason: "invalid-response" };
  }

  return { kind: "reserved", reservationId: body.id };
}
