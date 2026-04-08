import { getOrCreateMatch } from "@/lib/match-service";

export const runtime = "nodejs";

export async function GET() {
  try {
    const match = await getOrCreateMatch();
    return Response.json(match);
  } catch (error: any) {
    console.error("API MATCH ERROR:", error);
    return Response.json(
      { 
        error: "Internal Server Error", 
        message: error.message,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined
      }, 
      { status: 500 }
    );
  }
}
