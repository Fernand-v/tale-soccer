import { WebSocketServer, WebSocket } from "ws";
import { Game } from "./game";

const PORT = 8080;
const wss = new WebSocketServer({ port: PORT });
const game = new Game();

console.log(` Servidor Tale Soccer escuchando en ws://localhost:${PORT}`);

const clients = new Map<string, WebSocket>();
const readyPlayers = new Set<string>(); // jugadores que han presionado "Comenzar"

function getColor(index: number) {
  return index === 0 ? "blue" : "red";
}

function broadcast(obj: any) {
  const msg = JSON.stringify(obj);
  for (const client of clients.values()) {
    if (client.readyState === 1) client.send(msg);
  }
}

function broadcastState() {
  const stateJSON = JSON.stringify({ type: "state", state: game.state });
  for (const client of clients.values()) {
    if (client.readyState === 1) client.send(stateJSON);
  }
}

// Actualizar estado del juego
setInterval(() => {
  game.update(16);
  broadcastState();
}, 16);

wss.on("connection", (ws: WebSocket) => {
  const playerId = Math.random().toString(36).slice(2, 9);
  clients.set(playerId, ws);
  ws.send(JSON.stringify({ type: "init", id: playerId }));

  console.log(`👤 Jugador conectado (${playerId})`);

  ws.on("message", (msg) => {
    try {
      const data = JSON.parse(msg.toString());

      if (data.type === "join") {
        const currentPlayers = Object.keys(game.state.players);

        // Reiniciar si hay más de dos
        if (currentPlayers.length >= 2) {
          console.log("⚠️ Reiniciando juego: un nuevo jugador se unió");
          game.state.message = "Nuevo jugador conectado. Reiniciando partida...";
          game.state.items = [];
          game.state.players = {};
          readyPlayers.clear();
          broadcast({ type: "reset" });
        }

        const index = Object.keys(game.state.players).length;
        const color = getColor(index);
        game.addPlayer(playerId, color, data.name);
        console.log(`Jugador ${data.name} (${color}) se unió.`);

        ws.send(JSON.stringify({ type: "joined", color }));

        // Notificar si hay otro jugador conectado
        if (Object.keys(game.state.players).length === 2) {
          broadcast({
            type: "waitingStart",
            message: "Ambos conectados, presionen 'Comenzar' para iniciar el partido.",
          });
        }
      }

      if (data.type === "move") {
        game.movePlayer(playerId, data.dx, data.dy);
      }

      // ▶️ Jugador presionó “Comenzar”
      if (data.type === "readyUp") {
        readyPlayers.add(playerId);
        const total = Object.keys(game.state.players).length;

        if (readyPlayers.size === total && total === 2) {
          console.log("✅ Ambos jugadores listos. Iniciando partido...");
          game.state.message = "¡Comienza el partido!";
          broadcast({ type: "ready" });
          game.startMatch(); // nuevo método que habilita ítems
        } else {
          ws.send(JSON.stringify({ type: "waitingStart", message: "Esperando al otro jugador..." }));
        }
      }
    } catch (err) {
      console.error("Error procesando mensaje:", err);
    }
  });

  ws.on("close", () => {
    console.log(`❌ Jugador desconectado (${playerId})`);
    clients.delete(playerId);
    delete game.state.players[playerId];
    readyPlayers.delete(playerId);

    game.state.message = "⚠️ Un jugador se desconectó.";
    broadcast({ type: "disconnected", message: "⚠️ Un jugador se desconectó. Esperando nuevo oponente..." });
  });
});
