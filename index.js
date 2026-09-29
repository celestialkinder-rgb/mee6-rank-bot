const http = require("http");
const WebSocket = require("ws");

const token = process.env.DISCORD_TOKEN;

// =========================
// RENDER WEB SERVER
// =========================

const server = http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("B.T.N.L System is running!");
});

server.listen(process.env.PORT || 10000, "0.0.0.0", () => {
  console.log("WEB SERVER STARTED");
});

// =========================
// DISCORD API
// =========================

async function sendDiscordMessage(channelId, content) {
  try {
    const response = await fetch(
      `https://discord.com/api/v10/channels/${channelId}/messages`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bot ${token}`,
          "Content-Type": "application/json",
          "User-Agent": "DiscordBot (https://github.com/, 1.0)"
        },
        body: JSON.stringify({
          content: content
        })
      }
    );

    console.log("DISCORD API STATUS:", response.status);

    if (response.status === 429) {
      const retryAfter = response.headers.get("retry-after");

      console.log(
        "DISCORD RATE LIMITED. RETRY AFTER:",
        retryAfter
      );

      const text = await response.text();

      console.log(
        "DISCORD RATE LIMIT RESPONSE:",
        text.substring(0, 500)
      );

      return false;
    }

    const responseText = await response.text();

    console.log(
      "DISCORD API RESPONSE:",
      responseText.substring(0, 500)
    );

    if (!response.ok) {
      console.log(
        "DISCORD API ERROR:",
        response.status,
        response.statusText
      );

      return false;
    }

    return true;

  } catch (error) {
    console.error(
      "DISCORD API REQUEST ERROR:",
      error.message
    );

    return false;
  }
}

// =========================
// DISCORD GATEWAY
// =========================

const ws = new WebSocket(
  "wss://gateway.discord.gg/?v=10&encoding=json"
);

let heartbeatInterval;

ws.on("open", () => {
  console.log("DISCORD GATEWAY CONNECTED");
});

ws.on("message", async (data) => {
  const packet = JSON.parse(data.toString());

  // Discord Hello
  if (packet.op === 10) {

    heartbeatInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(
          JSON.stringify({
            op: 1,
            d: null
          })
        );
      }
    }, packet.d.heartbeat_interval);

    const intents =
      1 |
      512 |
      32768;

    ws.send(
      JSON.stringify({
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
      })
    );

    console.log("IDENTIFY SENT");
  }

  // Bot successfully connected
  if (packet.t === "READY") {
    console.log(
      "BOT ONLINE:",
      packet.d.user.username
    );
  }

  // New Discord message
  if (packet.t === "MESSAGE_CREATE") {

    const message = packet.d;

    // Ignore bots
    if (message.author?.bot) {
      return;
    }

    // !rank command
    if (
      message.content?.toLowerCase().trim() === "!rank"
    ) {

      console.log(
        "!rank USED BY:",
        message.author.username
      );

      const success = await sendDiscordMessage(
        message.channel_id,
        "Rank card test working!"
      );

      if (success) {
        console.log(
          "RANK RESPONSE SENT"
        );
      } else {
        console.log(
          "RANK RESPONSE FAILED"
        );
      }
    }
  }
});

// Gateway error
ws.on("error", (error) => {
  console.error(
    "WEBSOCKET ERROR:",
    error.message
  );
});

// Gateway closed
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
