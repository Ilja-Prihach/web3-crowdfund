import { eq } from "drizzle-orm";

import type { Database } from "../../db/client.ts";
import { profiles } from "../../db/schema.ts";

export async function findProfile(db: Database, address: string) {
  const [profile] = await db.select().from(profiles).where(eq(profiles.address, address.toLowerCase()));
  return profile ?? null;
}

// INSERT ON CONFLICT: первый и повторный PUT имеют один результат даже при конкурентном создании.
export async function saveProfile(db: Database, address: string, input: { name: string | null; bio: string | null }) {
  const fields = { name: input.name?.trim() || null, bio: input.bio?.trim() || null };
  const [profile] = await db.insert(profiles)
    .values({ address: address.toLowerCase(), ...fields })
    .onConflictDoUpdate({ target: profiles.address, set: { ...fields, updatedAt: new Date() } })
    .returning();
  if (!profile) throw new Error("Profile was not saved");
  return profile;
}
