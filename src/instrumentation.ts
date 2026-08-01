export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    try {
      const { seedBlueprintIfEmpty } = await import("./lib/blueprint/seed-app");
      await seedBlueprintIfEmpty();
    } catch (err) {
      console.error("[blueprint] Seed-Fehler beim Start:", err);
    }
  }
}
