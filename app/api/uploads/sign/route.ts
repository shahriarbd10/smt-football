import { NextResponse } from "next/server";
import { createCloudinarySignature, getCloudinaryConfig } from "@/lib/cloudinary";

export async function POST(request: Request) {
  try {
    const {
      folder = "smt-tournament/gallery",
      timestamp = String(Math.floor(Date.now() / 1000)),
    } = await request.json().catch(() => ({}));
    
    const { cloudName, apiKey, apiSecret } = getCloudinaryConfig();

    // Standardized high-quality optimization while maintaining original proportions
    const transformation = "c_limit,w_1920,h_1920,f_auto,q_auto";
    const publicId = `moment-${Date.now()}`;
    
    const signParams: Record<string, string> = { 
      folder, 
      public_id: publicId, 
      timestamp,
      transformation 
    };
    
    const signature = createCloudinarySignature(signParams, apiSecret);

    return NextResponse.json({
      cloudName,
      apiKey,
      timestamp,
      folder,
      publicId,
      signature,
      transformation
    });
  } catch (error: any) {
    return NextResponse.json(
      { message: error?.message || "Signature generation failed" },
      { status: 500 }
    );
  }
}
