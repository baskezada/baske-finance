import { Context } from "hono";
import { setCookie, getCookie, deleteCookie } from "hono/cookie";
import { sign, verify } from "hono/jwt";
import { db } from "./db";
import { users } from "./schema";
import { eq, and } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { OAuth2Client } from "google-auth-library";

const JWT_SECRET = process.env.JWT_SECRET || "change-me-at-all-costs";
const COOKIE_NAME = "baske_session";

export interface UserSession {
    id: string;
    email: string;
    name: string | null;
    avatarUrl: string | null;
}

// --- OAuth Strategies ---

export interface OAuthProfile {
    id: string;
    email: string;
    name?: string;
    avatarUrl?: string;
}

interface OAuthStrategy {
    getLoginUrl(): string;
    getProfile(code: string): Promise<OAuthProfile>;
}

class GoogleStrategy implements OAuthStrategy {
    private client: OAuth2Client;

    constructor() {
        this.client = new OAuth2Client(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            process.env.GOOGLE_REDIRECT_URI || "http://localhost:3000/auth/google/callback"
        );
    }

    getLoginUrl(): string {
        return this.client.generateAuthUrl({
            access_type: "offline",
            scope: ["https://www.googleapis.com/auth/userinfo.profile", "https://www.googleapis.com/auth/userinfo.email"],
            prompt: "select_account"
        });
    }

    async getProfile(code: string): Promise<OAuthProfile> {
        const { tokens } = await this.client.getToken(code);
        this.client.setCredentials(tokens);

        // In a real scenario, we'd use the id_token or request profile
        const ticket = await this.client.verifyIdToken({
            idToken: tokens.id_token!,
            audience: process.env.GOOGLE_CLIENT_ID,
        });
        const payload = ticket.getPayload();

        if (!payload || !payload.email) {
            throw new Error("Invalid Google profile");
        }

        return {
            id: payload.sub,
            email: payload.email,
            name: payload.name,
            avatarUrl: payload.picture,
        };
    }
}

const strategies: Record<string, OAuthStrategy> = {
    google: new GoogleStrategy(),
};

// --- Helper Functions ---

async function createSession(c: Context, user: typeof users.$inferSelect) {
    const session: UserSession = {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
    };

    const token = await sign(session, JWT_SECRET);

    setCookie(c, COOKIE_NAME, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "Lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 7, // 1 week
    });

    return session;
}

// --- Auth Controllers ---

export const authController = {
    async register(c: Context) {
        const { email, password, name } = await c.req.json();

        if (!email || !password) {
            return c.json({ error: "Email and password are required" }, 400);
        }

        const existing = await db.select().from(users).where(eq(users.email, email));
        if (existing.length > 0) {
            return c.json({ error: "Email already registered" }, 400);
        }

        const passwordHash = await bcrypt.hash(password, 10);

        const [user] = await db.insert(users).values({
            email,
            name,
            passwordHash,
        }).returning();

        const session = await createSession(c, user);
        return c.json(session, 201);
    },

    async login(c: Context) {
        const { email, password } = await c.req.json();

        const [user] = await db.select().from(users).where(eq(users.email, email));
        if (!user || !user.passwordHash) {
            return c.json({ error: "Invalid credentials" }, 401);
        }

        const isValid = await bcrypt.compare(password, user.passwordHash);
        if (!isValid) {
            return c.json({ error: "Invalid credentials" }, 401);
        }

        const session = await createSession(c, user);
        return c.json(session);
    },

    async me(c: Context) {
        const token = getCookie(c, COOKIE_NAME);
        if (!token) return c.json(null, 401);

        try {
            const payload = await verify(token, JWT_SECRET) as UserSession;
            return c.json(payload);
        } catch {
            return c.json(null, 401);
        }
    },

    async logout(c: Context) {
        deleteCookie(c, COOKIE_NAME);
        return c.json({ success: true });
    },

    async oauthLogin(c: Context) {
        const provider = c.req.param("provider");
        const strategy = strategies[provider];

        if (!strategy) return c.json({ error: "Provider not supported" }, 400);

        return c.redirect(strategy.getLoginUrl());
    },

    async oauthCallback(c: Context) {
        const provider = c.req.param("provider");
        const strategy = strategies[provider];
        const code = c.req.query("code");

        if (!strategy || !code) return c.redirect("/login?error=missing_code");

        try {
            const profile = await strategy.getProfile(code);

            // Upsert user
            let [user] = await db.select().from(users).where(eq(users.email, profile.email));

            if (!user) {
                [user] = await db.insert(users).values({
                    email: profile.email,
                    name: profile.name,
                    avatarUrl: profile.avatarUrl,
                    oauthProvider: provider,
                    oauthId: profile.id,
                }).returning();
            } else if (!user.oauthProvider) {
                // Link existing email account to OAuth
                [user] = await db.update(users).set({
                    oauthProvider: provider,
                    oauthId: profile.id,
                    avatarUrl: user.avatarUrl || profile.avatarUrl,
                }).where(eq(users.id, user.id)).returning();
            }

            await createSession(c, user);

            const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
            return c.redirect(`${frontendUrl}/main`);
        } catch (err) {
            console.error("OAuth Callback Error:", err);
            return c.redirect("/login?error=oauth_failed");
        }
    }
};

// --- Middleware ---

export const authMiddleware = async (c: Context, next: () => Promise<void>) => {
    const token = getCookie(c, COOKIE_NAME);
    if (!token) return c.json({ error: "Unauthorized" }, 401);

    try {
        const payload = await verify(token, JWT_SECRET);
        c.set("user", payload);
        await next();
    } catch {
        return c.json({ error: "Unauthorized" }, 401);
    }
};
