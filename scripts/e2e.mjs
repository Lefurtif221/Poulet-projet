import { chromium } from "playwright-core";
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const BASE = "http://localhost:3000";
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

const browser = await chromium.launch({ executablePath: CHROME, headless: true });
const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await context.newPage();

const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
page.on("console", (message) => {
  if (message.type() === "error") errors.push(message.text());
});

async function login(phone) {
  await page.goto(`${BASE}/connexion`, { waitUntil: "domcontentloaded" });
  await page.fill("#phone", phone);
  await page.fill("#pin", "1234");
  await page.getByRole("button", { name: /Se connecter/ }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/connexion"), { timeout: 60000 });
}

async function step(name, action) {
  process.stdout.write(`→ ${name}… `);
  await action();
  console.log("OK");
}

try {
  await step("connexion client", () => login("772222222"));
  await page.waitForURL("**/client/catalogue", { timeout: 60000 });

  await step("ajout au panier", async () => {
    const card = page.locator("article").first();
    const increment = card.getByRole("button", { name: "Augmenter" });
    for (let index = 0; index < 14; index += 1) await increment.click();
    await card.getByRole("button", { name: /FCFA/ }).click();
    await page.getByText("Ajouté").first().waitFor({ timeout: 15000 });
  });

  await step("ouverture panier", async () => {
    await page.goto(`${BASE}/client/panier`, { waitUntil: "domcontentloaded" });
    await page.getByRole("heading", { name: /Validation de la commande/ }).waitFor();
  });

  await step("validation commande", async () => {
    await page.locator('input[value="CASH_ON_DELIVERY"]').check();
    await page.getByRole("button", { name: /Confirmer la commande/ }).click();
    await page.waitForURL("**/client/commande/*", { timeout: 60000 });
    await page.getByText("Commande envoyée à l'éleveur").waitFor({ timeout: 30000 });
  });

  const reference = (await page.locator("h1").first().innerText()).replace("#", "").trim();
  console.log(`  référence créée : ${reference}`);

  const order = await db.order.findUnique({
    where: { reference },
    include: { supplier: { include: { user: true } } },
  });
  if (!order) throw new Error("Commande introuvable en base");

  await step("connexion éleveur", async () => {
    await context.clearCookies();
    await login(order.supplier.user.phone.replace("+221", ""));
    await page.waitForURL("**/fournisseur", { timeout: 60000 });
  });

  await step("acceptation éleveur", async () => {
    const card = page.locator(".card", { hasText: reference }).first();
    await card.getByRole("button", { name: /Accepter la commande/ }).click();
    await page.waitForTimeout(2500);
    await page.locator(".card", { hasText: reference }).first().getByText("Confirmée").waitFor({ timeout: 30000 });
  });

  await step("préparation et prêt à enlever", async () => {
    const card = page.locator(".card", { hasText: reference }).first();
    await card.getByRole("button", { name: /Marquer prêt à enlever/ }).click();
    await page.waitForTimeout(2500);
    const cardAfter = page.locator(".card", { hasText: reference }).first();
    await cardAfter.getByText("Prête à enlever").waitFor({ timeout: 30000 });
  });

  await step("file de notifications (admin)", async () => {
    await context.clearCookies();
    await login("770000000");
    await page.waitForURL("**/admin", { timeout: 60000 });
    await page.goto(`${BASE}/admin/notifications`, { waitUntil: "domcontentloaded" });
    await page.getByText("Nouvelle commande").first().waitFor({ timeout: 30000 });
  });

  await step("paiement et livraison (admin)", async () => {
    await page.goto(`${BASE}/admin/commandes/${order.id}`, { waitUntil: "domcontentloaded" });

    const paymentForm = page.locator("form", { hasText: "Marquer comme payé" }).first();
    await paymentForm.locator('input[name="reference"]').fill("E2E-TEST");
    await paymentForm.getByRole("button", { name: /Marquer comme payé/ }).click();
    await page.waitForTimeout(2500);

    const deliveryForm = page.locator("form", { hasText: "Enregistrer la livraison" });
    await deliveryForm.locator('select[name="status"]').selectOption("DELIVERED");
    await deliveryForm.getByRole("button", { name: /Enregistrer la livraison/ }).click();
    await page.waitForTimeout(2500);
    await page.getByText("Livrée", { exact: true }).first().waitFor({ timeout: 30000 });
  });

  await step("confirmation client", async () => {
    await context.clearCookies();
    await login("772222222");
    await page.goto(`${BASE}/client/commande/${order.id}`, { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: /Tout est conforme/ }).click();
    await page.waitForTimeout(2500);
    await page.getByText("Réception confirmée").waitFor({ timeout: 30000 });
  });

  await step("reversement éleveur généré", async () => {
    const payout = await db.payout.findFirst({
      where: { supplierId: order.supplierId },
      include: { items: true },
      orderBy: { createdAt: "desc" },
    });
    if (!payout) throw new Error("Aucun reversement créé après clôture");
    console.log(`\n  reversement : ${payout.amount} FCFA (${payout.items.length} commande)`);
  });

  if (errors.length > 0) {
    console.log("\nErreurs navigateur détectées :");
    for (const error of errors) console.log(" -", error);
  } else {
    console.log("\nAucune erreur navigateur.");
  }

  console.log("\nE2E terminé avec succès.");
} catch (error) {
  await page.screenshot({ path: "e2e-failure.png", fullPage: true });
  console.error("\nECHEC E2E :", error.message);
  console.error("URL au moment de l'échec :", page.url());
  process.exitCode = 1;
} finally {
  await browser.close();
  await db.$disconnect();
}
