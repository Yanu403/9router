import { NextResponse } from "next/server";
import { createProviderConnection } from "@/models";

// Import xAI OAuth credentials without ever echoing token material.
export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch (error) {
    return NextResponse.json({ error: `Invalid JSON: ${error.message}` }, { status: 400 });
  }

  const accounts = Array.isArray(body) ? body : body?.accounts;
  if (!Array.isArray(accounts) || accounts.length === 0) {
    return NextResponse.json({ error: "No accounts provided" }, { status: 400 });
  }

  const results = [];
  for (let index = 0; index < accounts.length; index++) {
    try {
      const raw = accounts[index];
      if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
        throw new Error("Item is not an object");
      }
      const tokens = raw.tokens || raw;
      const email = String(raw.email || "").trim().toLowerCase();
      const accessToken = tokens.access_token || tokens.accessToken;
      const refreshToken = tokens.refresh_token || tokens.refreshToken;
      const idToken = tokens.id_token || tokens.idToken;
      if (!email || !accessToken || !refreshToken) {
        throw new Error("Missing email, access token, or refresh token");
      }

      let expiresAt = tokens.expires_at || tokens.expiresAt;
      if (typeof expiresAt === "number") expiresAt = new Date(expiresAt * 1000).toISOString();
      const now = new Date().toISOString();
      const connection = await createProviderConnection({
        provider: "xai",
        authType: "oauth",
        name: email,
        email,
        isActive: true,
        accessToken,
        refreshToken,
        expiresAt,
        expiresIn: tokens.expires_in || tokens.expiresIn,
        scope: tokens.scope,
        testStatus: "active",
        errorCode: null,
        lastError: null,
        lastErrorAt: null,
        backoffLevel: 0,
        lastRefreshAt: now,
        providerSpecificData: idToken ? { idToken } : undefined,
      });
      results.push({ index, ok: true, id: connection.id });
    } catch (error) {
      results.push({ index, ok: false, error: error.message || "Unknown error" });
    }
  }

  const success = results.filter((result) => result.ok).length;
  return NextResponse.json({ success, failed: results.length - success, results });
}
