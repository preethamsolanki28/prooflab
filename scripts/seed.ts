import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

import { seedDemoData } from "../src/lib/seed";

async function main() {
  console.log("Seeding canonical Gardenia 2K26 demo projects...");
  const result = await seedDemoData();
  console.log("Result:", result);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
