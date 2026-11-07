import { NextResponse } from "next/server";
import { destroySession } from "@/lib/auth/session";

export async function POST() {
  try {
    await destroySession();
    return NextResponse.json({ message: "Signed out successfully." });
  } catch (error: unknown) {
    console.error("Logout error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred during logout." },
      { status: 500 },
    );
  }
}
