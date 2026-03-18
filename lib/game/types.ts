export type RoomPhase = "lobby" | "in-game" | "game-over";

export type TopToneSymbol = "˙" | null;
export type RightToneSymbol = "ˊ" | "ˇ" | "ˋ" | null;

export type BopomofoCell = {
  character: string;
  initial: string | null;
  medial: string | null;
  final: string | null;
  topTone: TopToneSymbol;
  tone: RightToneSymbol;
};

export type PlayerAnswer = BopomofoCell[];

export type Player = {
  id: string;
  displayName: string;
  isEliminated: boolean;
  hasSubmitted: boolean;
  joinedAt: number;
};

export type RoomRevealState = {
  guessedComponents: string[];
  playerWordRevealed: Record<string, boolean>;
};

export type GameRoom = {
  id: string;
  topic: string;
  wordCount: number;
  phase: RoomPhase;
  hostId: string;
  players: Player[];
  answers: Record<string, PlayerAnswer>;
  turnOrder: string[];
  activePlayerId: string | null;
  winnerId: string | null;
  createdAt: number;
  reveal: RoomRevealState;
};

export type HostRoomState = {
  id: string;
  topic: string;
  wordCount: number;
  phase: RoomPhase;
  hostId: string;
  players: Player[];
  answers: Record<string, PlayerAnswer>;
  turnOrder: string[];
  activePlayerId: string | null;
  winnerId: string | null;
  reveal: RoomRevealState;
};

export type PlayerRoomState = {
  id: string;
  topic: string;
  wordCount: number;
  phase: RoomPhase;
  players: Player[];
  turnOrder: string[];
  activePlayerId: string | null;
  winnerId: string | null;
  reveal: Pick<RoomRevealState, "guessedComponents">;
};

export type PublicRoomState = HostRoomState | PlayerRoomState;

export type GuessOutcome = "correct" | "wrong";
