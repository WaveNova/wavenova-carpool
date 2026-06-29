import { parse as parseCookieHeader } from "cookie";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { ENV } from "./env";
import { sdk } from "./sdk";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo";

function getRedirectUri(req: Request): string {
  const origin = ENV.canonicalOrigin || `${req.protocol}://${req.get("host")}`;
  return `${origin}/api/auth/google/callback`;
}

export function registerAuthRoutes(app: Express) {
  app.get("/api/auth/google", (req: Request, res: Response) => {
    if (!ENV.googleClientId) {
      res.status(500).send("Google OAuth is not configured.");
      return;
    }

    const state = Buffer.from(crypto.getRandomValues(new Uint8Array(16)))
      .toString("hex");

    // Store state in a short-lived cookie for CSRF protection
    res.cookie("oauth_state", state, {
      httpOnly: true,
      maxAge: 10 * 60 * 1000,
      sameSite: "lax",
      secure: req.secure || req.headers["x-forwarded-proto"] === "https",
    });

    const params = new URLSearchParams({
      client_id: ENV.googleClientId,
      redirect_uri: getRedirectUri(req),
      response_type: "code",
      scope: "openid email profile",
      state,
      access_type: "online",
    });

    res.redirect(`${GOOGLE_AUTH_URL}?${params.toString()}`);
  });

  app.get("/api/auth/google/callback", async (req: Request, res: Response) => {
    const { code, state, error } = req.query as Record<string, string>;

    if (error) {
      console.error("[GoogleAuth] OAuth error:", error);
      res.redirect("/?auth_error=1");
      return;
    }

    if (!code) {
      res.redirect("/?auth_error=1");
      return;
    }

    // Validate state to prevent CSRF
    const cookieMap = parseCookieHeader(req.headers.cookie ?? "");
    const storedState = cookieMap["oauth_state"];
    if (!storedState || storedState !== state) {
      console.warn("[GoogleAuth] State mismatch — possible CSRF");
      res.redirect("/?auth_error=1");
      return;
    }

    res.clearCookie("oauth_state");

    try {
      // Exchange code for tokens
      const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: ENV.googleClientId,
          client_secret: ENV.googleClientSecret,
          redirect_uri: getRedirectUri(req),
          grant_type: "authorization_code",
        }).toString(),
      });

      if (!tokenRes.ok) {
        throw new Error(`Token exchange failed: ${tokenRes.status}`);
      }

      const tokens = (await tokenRes.json()) as { access_token: string };

      // Fetch user info
      const userInfoRes = await fetch(GOOGLE_USERINFO_URL, {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });

      if (!userInfoRes.ok) {
        throw new Error(`UserInfo fetch failed: ${userInfoRes.status}`);
      }

      const userInfo = (await userInfoRes.json()) as {
        sub: string;
        name?: string;
        email?: string;
      };

      const now = new Date();
      await db.upsertUser({
        openId: userInfo.sub,
        name: userInfo.name ?? null,
        email: userInfo.email ?? null,
        loginMethod: "google",
        lastSignedIn: now,
      });

      const sessionToken = await sdk.createSessionToken(userInfo.sub, {
        name: userInfo.name ?? "",
        expiresInMs: ONE_YEAR_MS,
      });

      res.cookie(COOKIE_NAME, sessionToken, {
        ...getSessionCookieOptions(req),
        maxAge: ONE_YEAR_MS,
      });

      res.redirect("/");
    } catch (err) {
      console.error("[GoogleAuth] Callback error:", err);
      res.redirect("/?auth_error=1");
    }
  });
}
