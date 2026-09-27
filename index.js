const http = require("http");
const WebSocket = require("ws");

const token = process.env.DISCORD_TOKEN;

console.log("TOKEN EXISTS:", Boolean(token));
console.log("TOKEN LENGTH:", token ? token.length : 0);

const server = http.createServer((req, res) => {
  res.writeHead(200);
  res.end("Bot is running!");
});

server.listen(process.env.PORT || 10000, "0.0.0.0", () => {
  console.log("WEB SERVER STARTED");
});

const ws = new WebSocket("wss://gateway.discord.gg/?v=10&encoding=json");

ws.on("open", () => {
  console.log("DISCORD GATEWAY CONNECTED");

  ws.send(JSON.stringify({
    op: 2,
    d: {
      token: token,
      intents: 1,
      properties: {
        os: "linux",
        browser: "discord.js",
        device: "discord.js"
      }
    }
  }));

  console.log("IDENTIFY SENT");
});

ws.on("message", (data) => {
  console.log("GATEWAY MESSAGE RECEIVED");
  console.log(data.toString().slice(0, 500));
});

ws.on("error", (error) => {
  console.error("WEBSOCKET ERROR:", error.message);
});

ws.on("close", (code, reason) => {
  console.log("WEBSOCKET CLOSED:", code, reason.toString());
});
