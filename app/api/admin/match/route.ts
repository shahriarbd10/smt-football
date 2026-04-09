import { ADMIN_COOKIE_NAME, verifyAdminToken } from "@/lib/auth";
import {
  getOrCreateMatch,
  recordEvent,
  setElapsedMinutes,
  setLineup,
  setMatchMetadata,
  setScore,
  setTeamStats,
  setPlayersPerSide,
  setKickoffTime,
  setPlayerPosition,
  removeEventByReference,
  updateEventByReference,
  removeMember,
  removeUpcomingEvent,
  setUpcomingMemberStatus,
  updateMatchHistoryRecord,
  upsertMember,
  upsertUpcomingEvent,
  updatePlayerStat,
} from "@/lib/match-service";
import type { EventType, TeamKey } from "@/lib/match";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

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
  return Response.json(match, {
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
    },
  });
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
        (body.matchId as string | undefined) || "live",
        (body.matchTitle as string | undefined) || "Live Match",
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

    if (action === "setMatchMetadata") {
      const result = await setMatchMetadata({
        title: body.title as string | undefined,
        slotMinutes: Number(body.slotMinutes ?? NaN),
      });
      return Response.json(result);
    }

    if (action === "setTeamStats") {
      const result = await setTeamStats(body.teamKey as TeamKey, {
        score: Number(body.score ?? NaN),
        teamFouls: Number(body.teamFouls ?? NaN),
        yellowCards: Number(body.yellowCards ?? NaN),
        redCards: Number(body.redCards ?? NaN),
      });
      return Response.json(result);
    }

    if (action === "setPlayersPerSide") {
      const result = await setPlayersPerSide(Number(body.playersPerSide) as 6 | 7);
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
      const { eventId, matchId, minute, teamKey, playerName, type, createdAt } = body as any;
      const result = await removeEventByReference({
        eventId,
        matchId,
        minute,
        teamKey,
        playerName,
        type,
        createdAt,
      });
      return Response.json(result);
    }

    if (action === "updateEvent") {
      const result = await updateEventByReference({
        reference: {
          eventId: body.eventId as string | undefined,
          matchId: body.matchId as string | undefined,
          minute: body.minute as number | undefined,
          teamKey: body.teamKey as "A" | "B" | undefined,
          playerName: body.playerName as string | undefined,
          type: body.type as EventType | undefined,
          createdAt: body.createdAt as string | undefined,
        },
        updates: {
          matchId: body.newMatchId as string | undefined,
          matchTitle: body.newMatchTitle as string | undefined,
          minute: body.newMinute as number | undefined,
          teamKey: body.newTeamKey as TeamKey | undefined,
          playerName: body.newPlayerName as string | undefined,
          type: body.newType as EventType | undefined,
        },
      });
      return Response.json(result);
    }

    if (action === "updatePlayerStat") {
      const { teamKey, playerName, stat, increment } = body as any;
      const result = await updatePlayerStat(teamKey, playerName, stat, increment);
      return Response.json(result);
    }

    if (action === "upsertMember") {
      const result = await upsertMember({ id: body.id as string | undefined, name: body.name as string });
      return Response.json(result);
    }

    if (action === "removeMember") {
      const result = await removeMember(body.memberId as string);
      return Response.json(result);
    }

    if (action === "upsertUpcomingEvent") {
      const result = await upsertUpcomingEvent({
        id: body.id as string | undefined,
        title: body.title as string,
        eventDate: body.eventDate as string,
        slotMinutes: Number(body.slotMinutes ?? 90),
        notes: body.notes as string | undefined,
      });
      return Response.json(result);
    }

    if (action === "removeUpcomingEvent") {
      const result = await removeUpcomingEvent(body.eventId as string);
      return Response.json(result);
    }

    if (action === "setUpcomingMemberStatus") {
      const result = await setUpcomingMemberStatus({
        eventId: body.eventId as string,
        memberId: body.memberId as string,
        confirmed: body.confirmed as boolean | undefined,
        paymentStatus: body.paymentStatus as "paid" | "unpaid" | "pending" | undefined,
      });
      return Response.json(result);
    }

    if (action === "updateMatchHistoryRecord") {
      const result = await updateMatchHistoryRecord({
        id: body.id as string,
        title: body.title as string | undefined,
        kickoffTime: body.kickoffTime as string | undefined,
        slotMinutes: Number(body.slotMinutes ?? NaN),
        elapsedMinutes: Number(body.elapsedMinutes ?? NaN),
        teamStats: body.teamStats as
          | Array<{
              teamKey: TeamKey;
              score?: number;
              teamFouls?: number;
              yellowCards?: number;
              redCards?: number;
            }>
          | undefined,
      });
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
