import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import type { Role } from "@prisma/client";
import { db } from "@/lib/db";

const COOKIE_NAME = "guanar_session";
const SESSION_DAYS = 7;

export type SessionPayload = {
  sub: string;
  role: Role;
  name: string;
};

export type SessionUser = SessionPayload & {
  id: string;
  phone: string;
  clientId: string | null;
  supplierId: string | null;
};

function secret(): Uint8Array {
  const value = process.env.AUTH_SECRET;
  if (!value) throw new Error("AUTH_SECRET manquant");
  return new TextEncoder().encode(value);
}

export async function hashPin(pin: string): Promise<string> {
  return bcrypt.hash(pin, 10);
}

export async function verifyPin(pin: string, hash: string): Promise<boolean> {
  return bcrypt.compare(pin, hash);
}

export function isValidPin(pin: string): boolean {
  return /^\d{4,6}$/.test(pin);
}

export async function createSession(user: SessionPayload): Promise<void> {
  const token = await new SignJWT({ role: user.role, name: user.name })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.sub)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(secret());

  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

async function readToken(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    if (!payload.sub || !payload.role) return null;
    return {
      sub: payload.sub,
      role: payload.role as Role,
      name: (payload.name as string) ?? "",
    };
  } catch {
    return null;
  }
}

export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const token = await readToken();
  if (!token) return null;

  const user = await db.user.findUnique({
    where: { id: token.sub },
    include: { client: { select: { id: true } }, supplier: { select: { id: true } } },
  });
  if (!user || user.status !== "ACTIVE") return null;

  return {
    sub: user.id,
    id: user.id,
    role: user.role,
    name: user.name,
    phone: user.phone,
    clientId: user.client?.id ?? null,
    supplierId: user.supplier?.id ?? null,
  };
});

export async function requireUser(role?: Role): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/connexion");
  if (role && user.role !== role) redirect(homeFor(user.role));
  return user;
}

export function homeFor(role: Role): string {
  switch (role) {
    case "ADMIN":
      return "/admin";
    case "FOURNISSEUR":
      return "/fournisseur";
    default:
      return "/client/catalogue";
  }
}
