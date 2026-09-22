/**
 * The origin a phone needs to actually reach this app to scan an AR QR
 * code. "localhost" (what the dev browser bar shows) only resolves on the
 * machine itself. This container has no way to learn the *host* machine's
 * real LAN IP on its own — os.networkInterfaces() here would only return
 * Docker's internal bridge network (e.g. 172.x), which a phone can't reach
 * either.
 *
 * Deliberately a separate setting from WEB_GATEWAY_URL (Stripe's redirect
 * origin), not a reuse of it: the desktop browser stays on `localhost` for
 * checkout, and a cookie set for `localhost` is a different origin than
 * `192.168.x.x` as far as the browser is concerned — pointing
 * WEB_GATEWAY_URL at a LAN IP would silently drop the buyer's session on
 * Stripe's return trip. AR_PHONE_ORIGIN only ever feeds a QR code opened on
 * a *different* device (the phone), so it carries none of that risk.
 *
 * Point it at either:
 *   - http://<your-PC's-LAN-IP>:3000 (ipconfig/ifconfig) for same-Wi-Fi
 *     phone testing, or
 *   - the Cloudflare Quick Tunnel URL (scripts/start-quick-tunnel.ps1),
 *     which works from any network.
 * Returns null when unset, so the caller can show setup instructions
 * instead of a QR code that can't work.
 */
export function resolvePhoneReachableOrigin(): string | null {
  const configured = process.env.AR_PHONE_ORIGIN?.trim();
  if (!configured) return null;
  if (configured.includes("localhost") || configured.includes("127.0.0.1")) return null;
  return configured.replace(/\/$/, "");
}
