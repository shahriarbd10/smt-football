import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { PhotoModel } from "@/models/Photo";
import { ADMIN_COOKIE_NAME, verifyAdminToken } from "@/lib/auth";
import { createCloudinarySignature, getCloudinaryConfig } from "@/lib/cloudinary";

export async function GET(request: Request) {
  try {
    await connectToDatabase();

    const url = new URL(request.url);
    const matchId = (url.searchParams.get("matchId") || "live").trim();
    const query = matchId ? { matchId } : {};

    const photos = await PhotoModel.find(query).sort({ createdAt: -1 }).limit(50).lean();
    return NextResponse.json(photos);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { url, publicId, matchId = "live", matchTitle = "Live Match" } = await request.json();
    if (!url || !publicId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    await connectToDatabase();
    const photo = await PhotoModel.create({
      url,
      publicId,
      matchId: String(matchId || "live"),
      matchTitle: String(matchTitle || "Live Match"),
    });
    return NextResponse.json(photo);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

function getTokenFromCookieHeader(cookieHeader: string | null) {
  return cookieHeader
    ?.split(";")
    .map((v) => v.trim())
    .find((v) => v.startsWith(`${ADMIN_COOKIE_NAME}=`))
    ?.split("=")[1];
}

export async function DELETE(request: Request) {
  try {
    const token = getTokenFromCookieHeader(request.headers.get("cookie"));
    if (!verifyAdminToken(token)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const id = body?.id ? String(body.id) : "";
    const bodyPublicId = body?.publicId ? String(body.publicId) : "";

    if (!id && !bodyPublicId) {
      return NextResponse.json({ error: "Photo id or publicId is required" }, { status: 400 });
    }

    await connectToDatabase();

    const photo = id
      ? await PhotoModel.findById(id)
      : await PhotoModel.findOne({ publicId: bodyPublicId });

    if (!photo) {
      return NextResponse.json({ error: "Photo not found" }, { status: 404 });
    }

    const publicId = String(photo.publicId || bodyPublicId || "");

    if (publicId) {
      try {
        const { cloudName, apiKey, apiSecret } = getCloudinaryConfig();
        const timestamp = String(Math.floor(Date.now() / 1000));
        const signature = createCloudinarySignature({ public_id: publicId, timestamp }, apiSecret);

        const form = new URLSearchParams();
        form.set("public_id", publicId);
        form.set("timestamp", timestamp);
        form.set("api_key", apiKey);
        form.set("signature", signature);

        await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: form.toString(),
        });
      } catch {
        // Continue DB deletion even if cloud cleanup fails.
      }
    }

    await PhotoModel.deleteOne({ _id: photo._id });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Could not delete photo" }, { status: 500 });
  }
}
