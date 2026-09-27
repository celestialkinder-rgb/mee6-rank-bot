const http = require("http");
const WebSocket = require("ws");

const token = process.env.DISCORD_TOKEN;

// Render web server
const server = http.createServer((req, res) => {
  res.writeHead(200);
  res.end("B.T.N.L System is running!");
});

server.listen(process.env.PORT || 10000, "0.0.0.0", () => {
  console.log("WEB SERVER STARTED");
});

// Discord Gateway
const ws = new WebSocket(
  "wss://gateway.discord.gg/?v=10&encoding=json"
);

let heartbeatInterval;

ws.on("open", () => {
  console.log("DISCORD GATEWAY CONNECTED");
});

ws.on("message", async (data) => {
  const packet = JSON.parse(data.toString());

  // Discord Gateway connection
  if (packet.op === 10) {
    heartbeatInterval = setInterval(() => {
      ws.send(JSON.stringify({
        op: 1,
        d: null
      }));
    }, packet.d.heartbeat_interval);

    const intents =
      1 |       // GUILDS
      512 |     // GUILD_MESSAGES
      32768;    // MESSAGE_CONTENT

    ws.send(JSON.stringify({
      op: 2,
      d: {
        token: token,
        intents: intents,
        properties: {
          os: "linux",
          browser: "B.T.N.L System",
          device: "B.T.N.L System"
        }
      }
    }));

    console.log("IDENTIFY SENT");
  }

  // Bot is online
  if (packet.t === "READY") {
    console.log("BOT ONLINE:", packet.d.user.username);
  }

  // Message received
  if (packet.t === "MESSAGE_CREATE") {
    const message = packet.d;

    if (message.author?.bot) return;

    if (message.content?.toLowerCase() === "!rank") {
      console.log("!rank USED BY:", message.author.username);

      const response = {
        content: "Rank card test working!"
      };

      const result = await fetch(
        `https://discord.com/api/v10/channels/${message.channel_id}/messages`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bot ${token}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify(response)
        }
      );

      console.log("DISCORD API STATUS:", result.status);
      console.log(
        "DISCORD API RESPONSE:",
        await result.text()
      );
    }
  }
});

ws.on("error", (error) => {
  console.error("WEBSOCKET ERROR:", error.message);
});

ws.on("close", (code, reason) => {
  console.log(
    "WEBSOCKET CLOSED:",
    code,
    reason.toString()
  );

  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
  }
});
