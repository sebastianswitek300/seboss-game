import { Server } from "colyseus";
import { createServer } from "http";
import express from "express";
import cors from "cors";
import { GameRoom } from "./rooms/GameRoom";

const port = Number(process.env.PORT || 2567);
const host = process.env.HOST || "0.0.0.0";
const app = express();

app.use(cors());
app.use(express.json());

// Serve static files from public directory
app.use(express.static("public"));
// Serve logo assets from /img
app.use("/img", express.static("img"));
// Serve music snippets
app.use("/music", express.static("music"));
// Serve UI sounds
app.use("/ui-sound", express.static("ui-sound"));

const server = createServer(app);
const gameServer = new Server({
  server,
});

// Register GameRoom
gameServer.define("game", GameRoom);

gameServer.listen(port, host);
console.log(`🎮 Server running on http://${host}:${port}`);
