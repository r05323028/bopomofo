import { NextResponse } from "next/server";

import { gameRoomManager } from "@/lib/game/roomManager";

type CreateRoomBody = {
  topic?: string;
  wordCount?: number;
};

export async function POST(request: Request) {
  let body: CreateRoomBody;
  try {
    body = (await request.json()) as CreateRoomBody;
  } catch {
    return NextResponse.json({ message: "JSON 格式錯誤。" }, { status: 400 });
  }

  try {
    const room = gameRoomManager.createRoom({
      topic: body.topic ?? "",
      wordCount: body.wordCount ?? 0,
    });

    return NextResponse.json(room, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : "建立房間失敗。",
      },
      { status: 400 },
    );
  }
}
