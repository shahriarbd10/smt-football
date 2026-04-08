import { getOrCreateMatch } from "@/lib/match-service";

export const runtime = "nodejs";

export async function GET() {
  try {
    const match = await getOrCreateMatch();
    return Response.json(match);
  } catch (error: any) {
    return Response.json({ error: "Could not load match" }, { status: 500 });
  }
}
