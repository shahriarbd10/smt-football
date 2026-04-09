import { getOrCreateMatch } from "@/lib/match-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const match = await getOrCreateMatch();
    return Response.json(match, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      },
    });
  } catch (error: any) {
    return Response.json({ error: "Could not load match" }, { status: 500 });
  }
}
