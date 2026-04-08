import { getOrCreateMatch } from "@/lib/match-service";

export const runtime = "nodejs";

export async function GET() {
  const match = await getOrCreateMatch();
  return Response.json(match);
}
