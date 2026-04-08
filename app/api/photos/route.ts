import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { PhotoModel } from "@/models/Photo";

export async function GET() {
  try {
    await connectToDatabase();
    const photos = await PhotoModel.find().sort({ createdAt: -1 }).limit(50).lean();
    return NextResponse.json(photos);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { url, publicId } = await request.json();
    if (!url || !publicId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    await connectToDatabase();
    const photo = await PhotoModel.create({ url, publicId });
    return NextResponse.json(photo);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
