export type Player = {
  name : string;
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  hp: number;
  color: string;
  speed: number;
  score: number;
  power?: "speed" | "spikes";
  powerTimer?: number;
  invulnerable?: boolean;
};

export type Ball = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
};

export type Item = {
  id: string;
  x: number;
  y: number;
  type: "speed" | "spikes";
};

export type GameState = {
  players: Record<string, Player>;
  ball: Ball;
  items: Item[];
  message?: string;
  confetti?: boolean; 
  respawn?: Record<string, number>;
};
