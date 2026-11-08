"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  createSession,
  destroySession,
  hashPin,
  homeFor,
  verifyPin,
} from "@/lib/auth";
import { normalizePhone } from "@/lib/format";
import { logActivity } from "@/lib/activity";

export type AuthActionState = { error?: string };

const MAX_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

export async function loginAction(
  _prev: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const phone = normalizePhone(String(formData.get("phone") ?? ""));
  const pin = String(formData.get("pin") ?? "").trim();

  if (!phone || !pin) return { error: "Renseignez votre numéro et votre code PIN." };

  const user = await db.user.findUnique({ where: { phone } });
  if (!user) return { error: "Numéro ou code PIN incorrect." };

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    const minutes = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
    return { error: `Compte temporairement bloqué. Réessayez dans ${minutes} min.` };
  }

  if (user.status === "SUSPENDED") {
    return { error: "Ce compte est suspendu. Contactez l'administrateur." };
  }
  if (user.status === "REFUSED") {
    return { error: "Cette demande d'inscription a été refusée." };
  }

  const valid = await verifyPin(pin, user.pinHash);
  if (!valid) {
    const attempts = user.failedAttempts + 1;
    const locked = attempts >= MAX_ATTEMPTS;
    await db.user.update({
      where: { id: user.id },
      data: {
        failedAttempts: locked ? 0 : attempts,
        lockedUntil: locked ? new Date(Date.now() + LOCK_MINUTES * 60000) : null,
      },
    });
    await logActivity({
      userId: user.id,
      action: "LOGIN_FAILED",
      entity: "User",
      entityId: user.id,
    });
    return {
      error: locked
        ? `Trop d'essais. Compte bloqué pendant ${LOCK_MINUTES} minutes.`
        : `Numéro ou code PIN incorrect. ${MAX_ATTEMPTS - attempts} essai(s) restant(s).`,
    };
  }

  if (user.status === "PENDING") {
    return { error: "Votre compte est en attente de validation par l'administrateur." };
  }

  await db.user.update({
    where: { id: user.id },
    data: { failedAttempts: 0, lockedUntil: null, lastLoginAt: new Date() },
  });
  await createSession({ sub: user.id, role: user.role, name: user.name });
  await logActivity({ userId: user.id, action: "LOGIN", entity: "User", entityId: user.id });

  redirect(homeFor(user.role));
}

const clientSchema = z.object({
  establishment: z.string().trim().min(2, "Nom de l'établissement requis"),
  name: z.string().trim().min(2, "Nom du responsable requis"),
  phone: z.string().trim().min(1, "Téléphone requis"),
  address: z.string().trim().min(5, "Adresse de livraison requise"),
  district: z.string().trim().optional(),
  activityType: z.string().trim().optional(),
  ninea: z.string().trim().optional(),
  pin: z.string().regex(/^\d{4,6}$/, "Le PIN doit contenir 4 à 6 chiffres"),
  pinConfirm: z.string(),
});

export async function signupClientAction(
  _prev: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const parsed = clientSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  if (parsed.data.pin !== parsed.data.pinConfirm) return { error: "Les deux codes PIN ne correspondent pas." };

  const phone = normalizePhone(parsed.data.phone);
  if (!phone || phone.length < 10) return { error: "Numéro de téléphone invalide." };

  const existing = await db.user.findUnique({ where: { phone }, select: { id: true } });
  if (existing) return { error: "Un compte existe déjà avec ce numéro." };

  const pinHash = await hashPin(parsed.data.pin);
  const user = await db.user.create({
    data: {
      phone,
      pinHash,
      name: parsed.data.name,
      role: "CLIENT",
      status: "PENDING",
      client: {
        create: {
          type: "PRO",
          establishment: parsed.data.establishment,
          address: parsed.data.address,
          district: parsed.data.district || null,
          activityType: parsed.data.activityType || null,
          ninea: parsed.data.ninea || null,
        },
      },
    },
  });
  await logActivity({ userId: user.id, action: "SIGNUP_CLIENT", entity: "User", entityId: user.id });
  redirect("/en-attente");
}

const supplierSchema = z.object({
  farmName: z.string().trim().min(2, "Nom de l'élevage requis"),
  name: z.string().trim().min(2, "Nom du responsable requis"),
  phone: z.string().trim().min(1, "Téléphone requis"),
  location: z.string().trim().min(2, "Localisation requise"),
  capacity: z.coerce.number().int().min(0).default(0),
  farmType: z.string().trim().optional(),
  description: z.string().trim().optional(),
  paymentProvider: z.string().trim().optional(),
  paymentAccount: z.string().trim().optional(),
  pin: z.string().regex(/^\d{4,6}$/, "Le PIN doit contenir 4 à 6 chiffres"),
  pinConfirm: z.string(),
});

export async function signupSupplierAction(
  _prev: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const parsed = supplierSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  if (parsed.data.pin !== parsed.data.pinConfirm) return { error: "Les deux codes PIN ne correspondent pas." };

  const phone = normalizePhone(parsed.data.phone);
  if (!phone || phone.length < 10) return { error: "Numéro de téléphone invalide." };

  const existing = await db.user.findUnique({ where: { phone }, select: { id: true } });
  if (existing) return { error: "Un compte existe déjà avec ce numéro." };

  const pinHash = await hashPin(parsed.data.pin);
  const user = await db.user.create({
    data: {
      phone,
      pinHash,
      name: parsed.data.name,
      role: "FOURNISSEUR",
      status: "PENDING",
      supplier: {
        create: {
          farmName: parsed.data.farmName,
          location: parsed.data.location,
          capacity: parsed.data.capacity,
          farmType: parsed.data.farmType || null,
          description: parsed.data.description || null,
          paymentProvider: parsed.data.paymentProvider || null,
          paymentAccount: parsed.data.paymentAccount || null,
        },
      },
    },
  });
  await logActivity({ userId: user.id, action: "SIGNUP_SUPPLIER", entity: "User", entityId: user.id });
  redirect("/en-attente");
}

export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect("/connexion");
}
