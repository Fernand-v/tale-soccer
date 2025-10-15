import type { Player, GameState } from "./types";
import {
  FIELD_SIZE,
  BOX_SIZE,
  BALL_SIZE,
  clamp,
  collideBoxCircle,
  collidePlayers,
} from "./physics";
const deadtime = 3000;
const speed = 5;
const healt = 100;
export class Game {
  state: GameState;
  private nextItemTimer = 20000;
  private gameStarted = false;
  private goalCooldown = false;
  private respawnTimers: Record<string, number> = {};

  constructor() {
    this.state = {
      players: {},
      ball: { x: FIELD_SIZE / 2, y: FIELD_SIZE / 2, vx: 0, vy: 0, r: BALL_SIZE / 2 },
      items: [],
      confetti: false,
      message: "",
    };
  }

  addPlayer(id: string, color: string, name = "Jugador") {
    const isFirst = Object.keys(this.state.players).length === 0;
    const posX = isFirst ? 60 : FIELD_SIZE - 100;
    this.state.players[id] = {
      id,
      name,
      x: posX,
      y: FIELD_SIZE / 2 - BOX_SIZE / 2,
      vx: 0,
      vy: 0,
      hp: healt,
      color,
      speed: speed,
      score: 0,
    };
  }

  movePlayer(id: string, dx: number, dy: number) {
    const p = this.state.players[id];
    if (!p || !this.gameStarted) return;
    if (this.respawnTimers[id] && this.respawnTimers[id] > 0) return; // inactivo

    p.vx = dx * p.speed;
    p.vy = dy * p.speed;
    p.x = clamp(p.x + p.vx, 0, FIELD_SIZE - BOX_SIZE);
    p.y = clamp(p.y + p.vy, 0, FIELD_SIZE - BOX_SIZE);

    for (const [oid, o] of Object.entries(this.state.players)) {
      if (oid === id) continue;
      collidePlayers(p, o);
    }

    collideBoxCircle({ x: p.x, y: p.y, size: BOX_SIZE }, this.state.ball, p);
    this.checkItemPickup(p);
  }

  update(dt: number) {
    if (!this.gameStarted) return;

    // actualizar respawn
    for (const id in this.respawnTimers) {
      if (this.respawnTimers[id] > 0) {
        this.respawnTimers[id] -= dt;
        if (this.respawnTimers[id] <= 0) this.respawnPlayer(id);
      }
    }

    const b = this.state.ball;
    const subSteps = 3;
    for (let s = 0; s < subSteps; s++) {
      b.x += b.vx / subSteps;
      b.y += b.vy / subSteps;
      if (b.x < b.r || b.x > FIELD_SIZE - b.r) {
        b.vx *= -0.9;
        b.x = clamp(b.x, b.r, FIELD_SIZE - b.r);
      }
      if (b.y < b.r || b.y > FIELD_SIZE - b.r) {
        b.vy *= -0.9;
        b.y = clamp(b.y, b.r, FIELD_SIZE - b.r);
      }
      for (const p of Object.values(this.state.players)) {
        if (this.respawnTimers[p.id] && this.respawnTimers[p.id] > 0) continue;
        collideBoxCircle({ x: p.x, y: p.y, size: BOX_SIZE }, b, p);
      }
    }

    b.vx *= 0.99;
    b.vy *= 0.99;

    this.handleGoals();

    for (const p of Object.values(this.state.players)) {
      if (p.hp <= 0 && !this.respawnTimers[p.id]) this.killPlayer(p.id);
      if (p.powerTimer && p.powerTimer > 0) {
        p.powerTimer -= dt;
        if (p.powerTimer <= 0) {
          p.power = undefined;
          p.speed = 5;
        }
      }
    }

    if (this.gameStarted) {
      this.nextItemTimer -= dt;
      if (this.nextItemTimer <= 0) {
        const type = Math.random() < 0.5 ? "speed" : "spikes";
        this.state.items.push({
          id: Math.random().toString(36).slice(2, 7),
          x: Math.random() * (FIELD_SIZE - 50) + 25,
          y: Math.random() * (FIELD_SIZE - 50) + 25,
          type,
        });
        this.nextItemTimer = 20000;
      }
    }

    // enviar info de respawn al cliente
    this.state.respawn = {};
    for (const id in this.respawnTimers) {
      this.state.respawn[id] = Math.max(0, this.respawnTimers[id] / 1000);
    }
  }

  private handleGoals() {
    const b = this.state.ball;
    const goalSize = 100;
    const goalY = FIELD_SIZE / 2 - goalSize / 2;
    if (!this.goalCooldown && b.y > goalY && b.y < goalY + goalSize) {
      if (b.x <= b.r) this.scoreGoal("right");
      else if (b.x + b.r >= FIELD_SIZE) this.scoreGoal("left");
    }
  }

  private scoreGoal(side: "left" | "right") {
    this.goalCooldown = true;
    const players = Object.values(this.state.players);
    if (players.length < 2) return;

    if (side === "left") players[0].score++;
    else players[1].score++;

    this.state.message = "¡GOL! 🎉";
    this.state.confetti = true;
    setTimeout(() => {
      this.state.confetti = false;
      this.state.message = "";
      this.resetBall();
    }, 2000);
  }

  private resetBall() {
    this.state.ball = {
      x: FIELD_SIZE / 2,
      y: FIELD_SIZE / 2,
      vx: 0,
      vy: 0,
      r: BALL_SIZE / 2,
    };
    this.goalCooldown = false;
  }

  private checkItemPickup(player: Player) {
    for (let i = this.state.items.length - 1; i >= 0; i--) {
      const item = this.state.items[i];
      const dx = player.x - item.x;
      const dy = player.y - item.y;
      if (Math.sqrt(dx * dx + dy * dy) < 30) {
        if (item.type === "speed") {
          player.power = "speed";
          player.speed = 5 * 1.75;
          player.powerTimer = 10000;
        } else {
          player.power = "spikes";
          player.powerTimer = 10000;
        }
        this.state.items.splice(i, 1);
      }
    }
  }

  private killPlayer(id: string) {
    const p = this.state.players[id];
    if (!p) return;
    p.hp = 0;
    this.state.message = `${p.name} ha muerto 💀`;
    this.respawnTimers[id] = deadtime;
  }

  private respawnPlayer(id: string) {
    const p = this.state.players[id];
    if (!p) return;
    p.hp = 100;
    p.x = FIELD_SIZE / 2 - BOX_SIZE / 2;
    p.y = FIELD_SIZE / 2 - BOX_SIZE / 2;
    p.vx = 0;
    p.vy = 0;
    delete this.respawnTimers[id];
    this.state.message = `${p.name} ha reaparecido ⚡`;
    setTimeout(() => {
      if (this.state.message === `${p.name} ha reaparecido ⚡`) this.state.message = "";
    }, 1500);
  }

  startMatch() {
    this.gameStarted = true;
    this.nextItemTimer = 20000;
    this.state.items = [];
    this.state.message = "¡El partido ha comenzado!";
  }
}
