import { NextResponse } from "next/server";

import { gameRoomManager } from "@/lib/game/roomManager";
import { getSocketServer } from "@/lib/game/socketServer";
import type { PlayerAnswer } from "@/lib/game/types";
import { isAnswerComplete } from "@/lib/game/utils";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type JoinBody = {
  displayName?: string;
  avatarUrl?: string;
  answer?: PlayerAnswer;
};

export async function POST(request: Request, context: RouteContext) {
  const params = await context.params;
  const room = gameRoomManager.getRoom(params.id);

  if (!room) {
    return NextResponse.json({ message: "找不到房間。" }, { status: 404 });
  }

  let body: JoinBody;
  try {
    body = (await request.json()) as JoinBody;
  } catch {
    return NextResponse.json({ message: "JSON 格式錯誤。" }, { status: 400 });
  }

  if (!body.answer) {
    return NextResponse.json({ message: "請提供答案。" }, { status: 400 });
  }

  const validation = isAnswerComplete(body.answer, room.wordCount);
  if (!validation.valid) {
    const rows = validation.incompleteRows.map((index) => index + 1);
    return NextResponse.json(
      {
        message: `每一列都必須剛好輸入一個字（第 ${rows.join(", ")} 列）。`,
        incompleteRows: rows,
      },
      { status: 400 },
    );
  }

  try {
    const player = gameRoomManager.addPlayer({
      roomId: room.id,
      displayName: body.displayName ?? "",
      avatarUrl: body.avatarUrl ?? null,
    });

    gameRoomManager.submitAnswer(room.id, player.id, body.answer);

    const io = getSocketServer();
    io?.to(room.id).emit("player-joined", { player });
    io?.to(room.id).emit("answer-submitted", { playerId: player.id });

    return NextResponse.json({ playerId: player.id }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : "加入房間失敗。",
      },
      { status: 400 },
    );
  }
}
