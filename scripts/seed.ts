import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

import { seedDemoData, resetDemoData } from "../src/lib/seed";

async function main() {
  if (process.env.NEXT_PUBLIC_SUPABASE_URL?.includes("supabase.co") && !process.argv.includes("--force-remote-seed")) {
    console.error("SAFETY GUARD: Seeding demo data into the hosted production Supabase project is blocked.");
    console.error("To populate a local test database, use local credentials or pass --force-remote-seed.");
    process.exit(1);
  }

  const isReset = process.argv.includes("--reset");
  if (isReset) {
    console.log("Resetting canonical Gardenia 2K26 demo environment...");
    const result = await resetDemoData();
    console.log("Reset result:", result);
  } else {
    console.log("Seeding canonical Gardenia 2K26 demo projects...");
    const result = await seedDemoData();
    console.log("Result:", result);
  }
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
