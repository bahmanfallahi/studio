'use server';

import { seedDatabase } from "@/lib/seed";

export async function seedDatabaseAction(): Promise<{ success: boolean, message: string }> {
  try {
    const result = await seedDatabase();
    return result;
  } catch (error: any) {
    console.error("Server Action failed:", error);
    return {
      success: false,
      message: error.message || 'An unexpected error occurred during the seeding process.'
    };
  }
}
