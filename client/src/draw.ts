import type { GameState, Player } from "./types";

const BOX_SIZE = 40;
const BALL_SIZE = 20;
const trailHistory: Record<string, { x: number; y: number }[]> = {};
let confettiParticles: { x: number; y: number; vx: number; vy: number; color: string; size: number }[] = [];
let ballScale = 1;
let lastVX = 0;
let lastVY = 0;
let ballRotation = 0;

export function draw(ctx: CanvasRenderingContext2D, state: GameState, playerId: string) {
  ctx.clearRect(0, 0, 500, 500);

  const grass1 = "#4CAF50";
  const grass2 = "#43A047";
  const stripeHeight = 40;
  for (let y = 0; y < 500; y += stripeHeight) {
    ctx.fillStyle = Math.floor(y / stripeHeight) % 2 === 0 ? grass1 : grass2;
    ctx.fillRect(0, y, 500, stripeHeight);
  }

  ctx.strokeStyle = "white";
  ctx.lineWidth = 2;
  ctx.strokeRect(5, 5, 490, 490);
  ctx.beginPath();
  ctx.moveTo(250, 5);
  ctx.lineTo(250, 495);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(250, 250, 40, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeRect(5, 200, 40, 100);
  ctx.strokeRect(455, 200, 40, 100);
  ctx.fillStyle = "black";
  ctx.fillRect(0, 200, 10, 100);
  ctx.fillRect(490, 200, 10, 100);

  for (const item of state.items) {
    if (item.type === "speed") {
      const offset = Math.sin(Date.now() / 50) * 3;
      ctx.fillStyle = "yellow";
      ctx.beginPath();
      ctx.arc(item.x + offset, item.y, 10, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = "purple";
      ctx.beginPath();
      for (let a = 0; a < Math.PI * 2; a += Math.PI / 6) {
        const r = 8 + (a % (Math.PI / 3) === 0 ? 4 : 0);
        const x = item.x + Math.cos(a) * r;
        const y = item.y + Math.sin(a) * r;
        if (a === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
    }
  }

  const b = state.ball;
  const velChange = Math.abs(b.vx - lastVX) + Math.abs(b.vy - lastVY);
  if (velChange > 1.5) ballScale = 0.85;
  lastVX = b.vx;
  lastVY = b.vy;
  ballScale += (1 - ballScale) * 0.1;
  const squash = Math.max(0.9, Math.min(1.05, ballScale));
  const stretch = 2 - squash;
  const speed = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
  ballRotation += speed * 0.05;
  ctx.save();
  ctx.translate(b.x, b.y);
  ctx.rotate(ballRotation);
  ctx.scale(stretch, squash);
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(0, 0, BALL_SIZE / 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "black";
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI * 2 * i) / 6;
    const x = Math.cos(angle) * 6;
    const y = Math.sin(angle) * 6;
    ctx.beginPath();
    ctx.arc(x, y, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  const players: Player[] = Object.values(state.players);
  for (const p of players) {
    const remaining = state.respawn?.[p.id];
    if (remaining && remaining > 0) {
      if (p.id === playerId) {
        ctx.font = "20px Arial";
        ctx.fillStyle = "white";
        ctx.fillText(`Reapareces en ${remaining.toFixed(1)}s`, 150, 30);
      }
      continue;
    }

    if (!trailHistory[p.id]) trailHistory[p.id] = [];
    const history = trailHistory[p.id];
    history.push({ x: p.x, y: p.y });
    if (history.length > 10) history.shift();
    if (p.power === "speed") {
      for (let i = 0; i < history.length; i++) {
        const alpha = i / history.length;
        ctx.fillStyle = `${p.color}AA`;
        ctx.globalAlpha = alpha * 0.5;
        ctx.fillRect(history[i].x, history[i].y, BOX_SIZE, BOX_SIZE);
      }
      ctx.globalAlpha = 1;
    }

    ctx.fillStyle = p.color;
    ctx.fillRect(p.x, p.y, BOX_SIZE, BOX_SIZE);
    if (p.power === "spikes") {
      ctx.strokeStyle = "black";
      for (let i = 0; i < 8; i++) {
        const angle = (Math.PI * 2 * i) / 8;
        const px = p.x + BOX_SIZE / 2 + Math.cos(angle) * (BOX_SIZE / 2 + 5);
        const py = p.y + BOX_SIZE / 2 + Math.sin(angle) * (BOX_SIZE / 2 + 5);
        ctx.beginPath();
        ctx.moveTo(p.x + BOX_SIZE / 2, p.y + BOX_SIZE / 2);
        ctx.lineTo(px, py);
        ctx.stroke();
      }
    }
    const barWidth = BOX_SIZE;
    const barHeight = 6;
    const healthWidth = (p.hp / 100) * barWidth;
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x, p.y - 10, healthWidth, barHeight);
    ctx.strokeStyle = "black";
    ctx.strokeRect(p.x, p.y - 10, barWidth, barHeight);
  }

  ctx.font = "16px Arial";
  ctx.fillStyle = "white";
  const plist = Object.values(state.players);
  if (plist.length >= 2) {
    ctx.fillText(`${plist[0].score}`, 120, 30);
    ctx.fillText(`${plist[1].score}`, 360, 30);
  }

  if (state.confetti) {
    if (confettiParticles.length < 100) {
      for (let i = 0; i < 100; i++) {
        confettiParticles.push({
          x: Math.random() * 500,
          y: Math.random() * -50,
          vx: (Math.random() - 0.5) * 1.5,
          vy: Math.random() * 2 + 1,
          color: `hsl(${Math.random() * 360}, 80%, 60%)`,
          size: Math.random() * 4 + 2,
        });
      }
    }
    confettiParticles.forEach((p) => {
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, p.size, p.size);
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.02;
      if (p.y > 500) p.y = Math.random() * -20;
    });
  } else {
    confettiParticles = [];
  }

  if (state.message) {
    ctx.font = "28px Arial";
    ctx.fillStyle = "yellow";
    ctx.fillText(state.message, 150, 250);
  }
}
