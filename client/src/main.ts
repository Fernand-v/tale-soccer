import { draw } from "./draw";
import type { GameState } from "./types";

const canvas = document.getElementById("gameCanvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
const modal = document.getElementById("startModal")!;
const startBtn = document.getElementById("startBtn") as HTMLButtonElement;
const nameInput = document.getElementById("playerName") as HTMLInputElement;
const statusText = document.getElementById("statusText")!;
const server = 'ws://192.168.13.65:8080';//va el server de node 
let socket: WebSocket;
let playerId = "";
let playerName = "";
let keys: Record<string, boolean> = {};
let gameState: GameState | null = null;
let lastUpdate = performance.now();
let canStart = false;

function connect() {
  socket = new WebSocket(server);

  socket.onopen = () => {
    console.log("✅ Conectado al servidor");
    socket.send(JSON.stringify({ type: "join", name: playerName }));
    statusText.textContent = "Esperando a que se una otro jugador...";
  };

  socket.onmessage = (event) => {
    const data = JSON.parse(event.data);

    switch (data.type) {
      case "init":
        playerId = data.id;
        break;

      case "state":
        gameState = data.state;
        break;

      case "waitingStart":
        statusText.textContent = data.message;
        break;

      case "ready":
        statusText.textContent = "¡Listo! Iniciando partido...";
        setTimeout(() => {
          modal.classList.add("hidden");
          setTimeout(() => {
            modal.style.display = "none";
            statusText.textContent = "";
          }, 600);
        }, 500);
        break;

      case "reset":
        modal.style.display = "flex";
        modal.classList.remove("hidden");
        startBtn.disabled = false;
        nameInput.disabled = false;
        statusText.textContent = "Juego reiniciado. Inicia sesión nuevamente.";
        break;

      case "disconnected":
        modal.style.display = "flex";
        modal.classList.remove("hidden");
        startBtn.disabled = false;
        nameInput.disabled = false;
        statusText.textContent = data.message;
        break;
    }
  };

  socket.onclose = () => {
    statusText.textContent = "Conexión perdida. Recargando...";
    setTimeout(() => location.reload(), 2000);
  };
}

// 🕹️ Controles
window.addEventListener("keydown", (e) => (keys[e.key] = true));
window.addEventListener("keyup", (e) => (keys[e.key] = false));

function sendMovement() {
  if (!socket || socket.readyState !== WebSocket.OPEN) return;

  let dx = 0;
  let dy = 0;
  if (keys["ArrowUp"] || keys["w"]) dy -= 1;
  if (keys["ArrowDown"] || keys["s"]) dy += 1;
  if (keys["ArrowLeft"] || keys["a"]) dx -= 1;
  if (keys["ArrowRight"] || keys["d"]) dx += 1;

  socket.send(JSON.stringify({ type: "move", dx, dy }));
}

function loop() {
  const now = performance.now();
  const dt = now - lastUpdate;
  lastUpdate = now;

  if (gameState) draw(ctx, gameState, playerId);

  sendMovement();
  requestAnimationFrame(loop);
}

startBtn.addEventListener("click", () => {
  playerName = nameInput.value.trim() || "Jugador";
  nameInput.disabled = true;
  startBtn.disabled = true;
  statusText.textContent = "Conectando...";
  connect();

  // Cuando se conecte, enviará “readyUp” más adelante
  setTimeout(() => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: "readyUp" }));
    }
  }, 1000);
});

loop();
