import { ADMIN_COOKIE_NAME, verifyAdminToken } from "@/lib/auth";
import {
  getOrCreateMatch,
  recordEvent,
  setElapsedMinutes,
  setLineup,
  setScore,
  setKickoffTime,
  setPlayerPosition,
  removeEvent,
  updatePlayerStat,
} from "@/lib/match-service";
import type { EventType, TeamKey } from "@/lib/match";

export const runtime = "nodejs";

function unauthorized() {
  return Response.json({ error: "Unauthorized" }, { status: 401 });
}

export async function GET(request: Request) {
  const cookieHeader = request.headers.get("cookie");
  const token = cookieHeader
    ?.split(";")
    .map((v) => v.trim())
    .find((v) => v.startsWith(`${ADMIN_COOKIE_NAME}=`))
    ?.split("=")[1];

  if (!verifyAdminToken(token)) {
    return unauthorized();
  }

  const match = await getOrCreateMatch();
  return Response.json(match);
}

export async function PATCH(request: Request) {
  const cookieHeader = request.headers.get("cookie");
  const token = cookieHeader
    ?.split(";")
    .map((v) => v.trim())
    .find((v) => v.startsWith(`${ADMIN_COOKIE_NAME}=`))
    ?.split("=")[1];

  if (!verifyAdminToken(token)) {
    return unauthorized();
  }

  const body = await request.json();

  try {
    const action = body?.action as string;

    if (action === "setLineup") {
      const result = await setLineup(
        body.teamKey as TeamKey,
        body.starters as string[],
        body.goalkeeper as string,
      );
      return Response.json(result);
    }

    if (action === "recordEvent") {
      const result = await recordEvent(
        body.teamKey as TeamKey,
        body.playerName as string,
        body.type as EventType,
        Number(body.minute ?? 0),
      );
      return Response.json(result);
    }

    if (action === "setElapsedMinutes") {
      const result = await setElapsedMinutes(Number(body.elapsedMinutes ?? 0));
      return Response.json(result);
    }

    if (action === "setScore") {
      const result = await setScore(
        body.teamKey as TeamKey,
        Number(body.score ?? 0),
      );
      return Response.json(result);
    }

    if (action === "setKickoffTime") {
      const result = await setKickoffTime(body.kickoffTime as string);
      return Response.json(result);
    }

    if (action === "setPlayerPosition") {
      const { teamKey, playerName, x, y } = body as any;
      const result = await setPlayerPosition(teamKey, playerName, x, y);
      return Response.json(result);
    }

    if (action === "removeEvent") {
      const { eventId } = body as any;
      const result = await removeEvent(eventId);
      return Response.json(result);
    }

    if (action === "updatePlayerStat") {
      const { teamKey, playerName, stat, increment } = body as any;
      const result = await updatePlayerStat(teamKey, playerName, stat, increment);
      return Response.json(result);
    }

    return Response.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not update match data.",
      },
      { status: 400 },
    );
  }
}
