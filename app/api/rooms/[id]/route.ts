import { NextResponse } from "next/server";

import { gameRoomManager } from "@/lib/game/roomManager";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const params = await context.params;
  const room = gameRoomManager.getPublicRoomState(params.id);

  if (!room) {
    return NextResponse.json({ message: "找不到房間。" }, { status: 404 });
  }

  return NextResponse.json(
    {
      id: room.id,
      topic: room.topic,
      wordCount: room.wordCount,
      phase: room.phase,
      players: room.players.map((player) => ({
        id: player.id,
        displayName: player.displayName,
        avatarUrl: player.avatarUrl,
        hasSubmitted: player.hasSubmitted,
        isEliminated: player.isEliminated,
      })),
    },
    { status: 200 },
  );
}
