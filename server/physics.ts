export const FIELD_SIZE = 500;
export const BOX_SIZE = 40;
export const BALL_SIZE = 20;

export function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

/**
 * Colisión física sólida entre jugador (caja) y pelota (círculo)
 * - Separación exacta sin solapamiento
 * - Rebote realista
 * - Retroceso mínimo del jugador
 */
export function collideBoxCircle(
  box: { x: number; y: number; size: number },
  ball: { x: number; y: number; r: number; vx: number; vy: number },
  player?: any
) {
  // Punto más cercano de la pelota al cuadrado
  const closestX = Math.max(box.x, Math.min(ball.x, box.x + box.size));
  const closestY = Math.max(box.y, Math.min(ball.y, box.y + box.size));

  const dx = ball.x - closestX;
  const dy = ball.y - closestY;
  const distSq = dx * dx + dy * dy;
  const radius = ball.r;

  if (distSq < radius * radius) {
    const dist = Math.sqrt(distSq) || 0.001;
    const nx = dx / dist;
    const ny = dy / dist;
    const overlap = radius - dist;

    // ---- Reposicionar ambos cuerpos ----
    // Mover la pelota fuera del jugador
    ball.x += nx * (overlap + 0.5);
    ball.y += ny * (overlap + 0.5);

    // Retroceso del jugador
    if (player) {
      player.x -= nx; // 1 px hacia atrás aprox
      player.y -= ny;
      player.x = clamp(player.x, 0, FIELD_SIZE - BOX_SIZE);
      player.y = clamp(player.y, 0, FIELD_SIZE - BOX_SIZE);
    }

    // ---- Cálculo del rebote ----
    const pvx = player ? player.vx || 0 : 0;
    const pvy = player ? player.vy || 0 : 0;
    const relVX = ball.vx - pvx;
    const relVY = ball.vy - pvy;

    // Solo rebote si se están acercando
    const relDot = relVX * nx + relVY * ny;
    if (relDot < 0) {
      const restitution = 0.85; // rebote elástico pero no exagerado
      const impulse = -(1 + restitution) * relDot;

      ball.vx += impulse * nx;
      ball.vy += impulse * ny;

      // Pequeño impulso extra si el jugador se mueve
      ball.vx += pvx * 0.4;
      ball.vy += pvy * 0.4;

      // Fricción leve para estabilidad
      ball.vx *= 0.98;
      ball.vy *= 0.98;
    }

    // Limitar posiciones dentro del campo
    ball.x = clamp(ball.x, radius, FIELD_SIZE - radius);
    ball.y = clamp(ball.y, radius, FIELD_SIZE - radius);
  }
}

/**
 * Colisión entre jugadores con daño de spikes
 */
export function collidePlayers(a: any, b: any) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const minDist = BOX_SIZE;

  if (dist < minDist && dist > 0) {
    const overlap = (minDist - dist) / 2;
    const nx = dx / dist;
    const ny = dy / dist;

    a.x += nx * overlap;
    a.y += ny * overlap;
    b.x -= nx * overlap;
    b.y -= ny * overlap;

    a.x = clamp(a.x, 0, FIELD_SIZE - BOX_SIZE);
    a.y = clamp(a.y, 0, FIELD_SIZE - BOX_SIZE);
    b.x = clamp(b.x, 0, FIELD_SIZE - BOX_SIZE);
    b.y = clamp(b.y, 0, FIELD_SIZE - BOX_SIZE);

    // daño por spikes
    if (a.power === "spikes" && !b.invulnerable) {
      b.hp = Math.max(0, b.hp - 20);
      b.invulnerable = true;
      setTimeout(() => (b.invulnerable = false), 700);
    }
    if (b.power === "spikes" && !a.invulnerable) {
      a.hp = Math.max(0, a.hp - 20);
      a.invulnerable = true;
      setTimeout(() => (a.invulnerable = false), 700);
    }
  }
}
