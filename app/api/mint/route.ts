import { NextRequest, NextResponse } from "next/server";
import { mintNft } from "@/nft"; // adjust path if needed

export async function POST(req: NextRequest) {
  try {
    // 👇 Step 1: Parse JSON body
    const body = await req.json();

    // 👇 Step 2: Extract ownerId
    const { ownerId } = body;
    const { img } = body;
    console.log(img);
    if (!ownerId) {
      return NextResponse.json({ success: false, error: "Missing ownerId" });
    }

    // 👇 Step 3: Pass ownerId to mintNft
    await mintNft(ownerId, img);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message });
  }
}

