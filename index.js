const http = require("http");
const WebSocket = require("ws");
const { createCanvas, loadImage } = require("canvas");

const token = process.env.DISCORD_TOKEN;

// =========================
// USER DATA
// =========================

const users = new Map();

function getUser(userId) {
  if (!users.has(userId)) {
    users.set(userId, {
      xp: 0,
      level: 0
    });
  }

  return users.get(userId);
}

function xpNeeded(level) {
  return 220 + level * 100;
}

// =========================
// WEB SERVER
// =========================

const server = http.createServer((req, res) => {
  res.writeHead(200, {
    "Content-Type": "text/plain"
  });

  res.end("B.T.N.L System is running!");
});

server.listen(
  process.env.PORT || 10000,
  "0.0.0.0",
  () => {
    console.log("WEB SERVER STARTED");
  }
);

// =========================
// SEND IMAGE TO DISCORD
// =========================

async function sendRankCard(channelId, imageBuffer) {
  try {
    const form = new FormData();

    form.append(
      "payload_json",
      JSON.stringify({
        attachments: [
          {
            id: 0,
            filename: "rank.png"
          }
        ]
      })
    );

    form.append(
      "files[0]",
      new Blob([imageBuffer], {
        type: "image/png"
      }),
      "rank.png"
    );

    const response = await fetch(
      `https://discord.com/api/v10/channels/${channelId}/messages`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bot ${token}`,
          "User-Agent": "DiscordBot (https://github.com/, 1.0)"
        },
        body: form
      }
    );

    console.log(
      "DISCORD API STATUS:",
      response.status
    );

    if (response.status === 429) {
      console.log(
        "RATE LIMITED:",
        response.headers.get("retry-after")
      );

      return false;
    }

    const responseText = await response.text();

    console.log(
      "DISCORD RESPONSE:",
      responseText.substring(0, 300)
    );

    return response.ok;

  } catch (error) {
    console.error(
      "SEND IMAGE ERROR:",
      error.message
    );

    return false;
  }
}

// =========================
// CREATE RANK CARD
// =========================

async function createRankCard(message, userData, rank) {
  const width = 1000;
  const height = 300;

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  // Background
  const background = ctx.createLinearGradient(
    0,
    0,
    width,
    height
  );

  background.addColorStop(0, "#20252d");
  background.addColorStop(1, "#11151b");

  ctx.fillStyle = background;
  ctx.fillRect(0, 0, width, height);

  // Avatar
  let avatar = null;

  if (message.author.avatar) {
    try {
      avatar = await loadImage(
        `https://cdn.discordapp.com/avatars/${message.author.id}/${message.author.avatar}.png?size=256`
      );
    } catch (error) {
      console.log("AVATAR LOAD FAILED");
    }
  }

  const avatarX = 55;
  const avatarY = 50;
  const avatarSize = 200;

  ctx.save();

  ctx.beginPath();

  ctx.arc(
    avatarX + avatarSize / 2,
    avatarY + avatarSize / 2,
    avatarSize / 2,
    0,
    Math.PI * 2
  );

  ctx.clip();

  if (avatar) {
    ctx.drawImage(
      avatar,
      avatarX,
      avatarY,
      avatarSize,
      avatarSize
    );
  } else {
    ctx.fillStyle = "#555b66";

    ctx.fillRect(
      avatarX,
      avatarY,
      avatarSize,
      avatarSize
    );
  }

  ctx.restore();

  // Green status dot
  ctx.beginPath();

  ctx.arc(
    220,
    225,
    22,
    0,
    Math.PI * 2
  );

  ctx.fillStyle = "#43b581";
  ctx.fill();

  ctx.lineWidth = 6;
  ctx.strokeStyle = "#20252d";
  ctx.stroke();

  // Username
  ctx.font = "bold 42px Arial";
  ctx.fillStyle = "#ffffff";

  ctx.fillText(
    message.author.username,
    285,
    105
  );

  // Rank
  ctx.font = "bold 25px Arial";
  ctx.fillStyle = "#c9cdd3";
  ctx.textAlign = "right";

  ctx.fillText(
    `RANK #${rank}`,
    945,
    65
  );

  ctx.textAlign = "left";

  // Level
  ctx.font = "bold 30px Arial";
  ctx.fillStyle = "#4da3ff";

  ctx.fillText(
    `LEVEL ${userData.level}`,
    285,
    155
  );

  // XP text
  const needed = xpNeeded(userData.level);

  ctx.font = "bold 24px Arial";
  ctx.fillStyle = "#ffffff";

  ctx.fillText(
    `${userData.xp} / ${needed} XP`,
    285,
    195
  );

  // XP bar background
  const barX = 285;
  const barY = 220;
  const barWidth = 660;
  const barHeight = 35;

  ctx.fillStyle = "#252a31";

  ctx.beginPath();

  ctx.roundRect(
    barX,
    barY,
    barWidth,
    barHeight,
    18
  );

  ctx.fill();

  // XP progress
  const progress = Math.min(
    userData.xp / needed,
    1
  );

  if (progress > 0) {
    ctx.fillStyle = "#4da3ff";

    ctx.beginPath();

    ctx.roundRect(
      barX,
      barY,
      barWidth * progress,
      barHeight,
      18
    );

    ctx.fill();
  }

  // XP bar outline
  ctx.lineWidth = 3;
  ctx.strokeStyle = "#090b0e";

  ctx.beginPath();

  ctx.roundRect(
    barX,
    barY,
    barWidth,
    barHeight,
    18
  );

  ctx.stroke();

  return canvas.toBuffer("image/png");
}

// =========================
// DISCORD GATEWAY
// =========================

const ws = new WebSocket(
  "wss://gateway.discord.gg/?v=10&encoding=json"
);

let heartbeatInterval;

ws.on("open", () => {
  console.log(
    "DISCORD GATEWAY CONNECTED"
  );
});

ws.on("message", async (data) => {
  const packet = JSON.parse(
    data.toString()
  );

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

  // Bot ready
  if (packet.t === "READY") {
    console.log(
      "BOT ONLINE:",
      packet.d.user.username
    );
  }

  // New message
  if (packet.t === "MESSAGE_CREATE") {

    const message = packet.d;

    if (message.author?.bot) {
      return;
    }

    // Add random XP: 0-100
    const user = getUser(
      message.author.id
    );

    const gainedXP = Math.floor(
      Math.random() * 101
    );

    user.xp += gainedXP;

    // Level up
    while (
      user.xp >= xpNeeded(user.level)
    ) {
      user.xp -= xpNeeded(user.level);
      user.level++;

      console.log(
        `${message.author.username} reached level ${user.level}`
      );
    }

    // !rank
    if (
      message.content?.toLowerCase().trim() ===
      "!rank"
    ) {

      console.log(
        "!rank USED BY:",
        message.author.username
      );

      const allUsers = [
        ...users.entries()
      ];

      allUsers.sort(
        (a, b) =>
          b[1].level - a[1].level
      );

      const rankIndex =
        allUsers.findIndex(
          ([id]) =>
            id === message.author.id
        );

      const rank =
        rankIndex === -1
          ? 1
          : rankIndex + 1;

      try {

        const image =
          await createRankCard(
            message,
            user,
            rank
          );

        const success =
          await sendRankCard(
            message.channel_id,
            image
          );

        if (success) {
          console.log(
            "RANK CARD SENT"
          );
        } else {
          console.log(
            "RANK CARD FAILED"
          );
        }

      } catch (error) {

        console.error(
          "RANK CARD ERROR:",
          error
        );
      }
    }
  }
});

// Gateway errors
ws.on("error", (error) => {
  console.error(
    "WEBSOCKET ERROR:",
    error.message
  );
});

ws.on("close", (code, reason) => {

  console.log(
    "WEBSOCKET CLOSED:",
    code,
    reason.toString()
  );

  if (heartbeatInterval) {
    clearInterval(
      heartbeatInterval
    );
  }
});
