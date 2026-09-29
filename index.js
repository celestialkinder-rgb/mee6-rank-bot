const http = require("http");
const WebSocket = require("ws");
const path = require("path");
const fs = require("fs");
const { createCanvas, loadImage } = require("canvas");

const token = process.env.DISCORD_TOKEN;

if (!token) {
  console.error("DISCORD_TOKEN is missing.");
  process.exit(1);
}

// =========================
// FILES
// =========================

const backgroundPath = path.join(__dirname, "background.jpeg");
const ugLogoPath = path.join(__dirname, "ug-logo.png");

let backgroundImage = null;
let ugLogoImage = null;

// Load local artwork once at startup so !rank does not wait for
// the background/logo to load every time.
const artworkReady = (async () => {
  try {
    if (fs.existsSync(backgroundPath)) {
      backgroundImage = await loadImage(backgroundPath);
      console.log("BACKGROUND LOADED");
    } else {
      console.log(
        "background.jpeg NOT FOUND - USING FALLBACK BACKGROUND"
      );
    }
  } catch (error) {
    console.error(
      "BACKGROUND LOAD ERROR:",
      error.message
    );
  }

  try {
    if (fs.existsSync(ugLogoPath)) {
      ugLogoImage = await loadImage(ugLogoPath);
      console.log("UG LOGO LOADED");
    } else {
      console.log(
        "ug-logo.png NOT FOUND - USING FALLBACK UG TEXT"
      );
    }
  } catch (error) {
    console.error(
      "UG LOGO LOAD ERROR:",
      error.message
    );
  }
})();

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

function formatXP(value) {
  if (value >= 1000000) {
    return `${(value / 1000000)
      .toFixed(2)
      .replace(/0+$/, "")
      .replace(/\.$/, "")}M`;
  }

  if (value >= 1000) {
    return `${(value / 1000)
      .toFixed(2)
      .replace(/0+$/, "")
      .replace(/\.$/, "")}K`;
  }

  return String(value);
}

// =========================
// AVATAR CACHE
// =========================

const avatarCache = new Map();
const AVATAR_CACHE_MS = 5 * 60 * 1000;

async function getAvatar(message) {
  const avatarHash = message.author?.avatar;

  if (!avatarHash) {
    return null;
  }

  const cacheKey =
    `${message.author.id}:${avatarHash}`;

  const cached = avatarCache.get(cacheKey);

  if (
    cached &&
    Date.now() - cached.time < AVATAR_CACHE_MS
  ) {
    return cached.image;
  }

  try {
    const image = await loadImage(
      `https://cdn.discordapp.com/avatars/${message.author.id}/${avatarHash}.png?size=256`
    );

    avatarCache.set(cacheKey, {
      image,
      time: Date.now()
    });

    return image;

  } catch (error) {
    console.log(
      "AVATAR LOAD FAILED:",
      error.message
    );

    return null;
  }
}

// =========================
// WEB SERVER
// =========================

const server = http.createServer((req, res) => {
  res.writeHead(200, {
    "Content-Type":
      "text/plain; charset=utf-8",
    "Cache-Control": "no-store"
  });

  res.end(
    "B.T.N.L System is running!"
  );
});

server.listen(
  process.env.PORT || 10000,
  "0.0.0.0",
  () => {
    console.log(
      "WEB SERVER STARTED"
    );
  }
);

// =========================
// DISCORD API
// =========================

async function sendRankCard(
  channelId,
  imageBuffer
) {
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
          Authorization:
            `Bot ${token}`,

          "User-Agent":
            "DiscordBot (https://github.com/, 1.0)"
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

    const responseText =
      await response.text();

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
// DRAW HELPERS
// =========================

function roundedRect(
  ctx,
  x,
  y,
  width,
  height,
  radius
) {
  const r = Math.min(
    radius,
    width / 2,
    height / 2
  );

  ctx.beginPath();

  ctx.moveTo(
    x + r,
    y
  );

  ctx.arcTo(
    x + width,
    y,
    x + width,
    y + height,
    r
  );

  ctx.arcTo(
    x + width,
    y + height,
    x,
    y + height,
    r
  );

  ctx.arcTo(
    x,
    y + height,
    x,
    y,
    r
  );

  ctx.arcTo(
    x,
    y,
    x + width,
    y,
    r
  );

  ctx.closePath();
}

function drawCover(
  ctx,
  image,
  x,
  y,
  width,
  height
) {
  const scale = Math.max(
    width / image.width,
    height / image.height
  );

  const sourceWidth =
    width / scale;

  const sourceHeight =
    height / scale;

  const sourceX =
    (image.width - sourceWidth) / 2;

  const sourceY =
    (image.height - sourceHeight) / 2;

  ctx.drawImage(
    image,
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
    x,
    y,
    width,
    height
  );
}

function drawTextWithShadow(
  ctx,
  text,
  x,
  y,
  font,
  fillStyle,
  textAlign = "left"
) {
  ctx.save();

  ctx.font = font;
  ctx.textAlign = textAlign;
  ctx.textBaseline = "alphabetic";

  ctx.shadowColor =
    "rgba(0, 0, 0, 0.78)";

  ctx.shadowBlur = 3;
  ctx.shadowOffsetX = 1;
  ctx.shadowOffsetY = 2;

  ctx.fillStyle = fillStyle;

  ctx.fillText(
    text,
    x,
    y
  );

  ctx.restore();
}

// =========================
// CREATE RANK CARD
// =========================

async function createRankCard(
  message,
  userData,
  rank
) {
  // Exact size of your reference card.
  const width = 934;
  const height = 282;

  await artworkReady;

  const canvas =
    createCanvas(
      width,
      height
    );

  const ctx =
    canvas.getContext("2d");

  // =========================
  // BACKGROUND
  // =========================

  if (backgroundImage) {

    ctx.save();

    // Very small blur like the reference.
    ctx.filter =
      "blur(1.5px)";

    drawCover(
      ctx,
      backgroundImage,
      -2,
      -2,
      width + 4,
      height + 4
    );

    ctx.restore();

    // Subtle dark overlay for readability.
    const overlay =
      ctx.createLinearGradient(
        0,
        0,
        width,
        0
      );

    overlay.addColorStop(
      0,
      "rgba(0, 0, 0, 0.10)"
    );

    overlay.addColorStop(
      0.48,
      "rgba(0, 0, 0, 0.06)"
    );

    overlay.addColorStop(
      1,
      "rgba(0, 0, 0, 0.16)"
    );

    ctx.fillStyle =
      overlay;

    ctx.fillRect(
      0,
      0,
      width,
      height
    );

  } else {

    const fallback =
      ctx.createLinearGradient(
        0,
        0,
        width,
        height
      );

    fallback.addColorStop(
      0,
      "#3a2020"
    );

    fallback.addColorStop(
      1,
      "#121820"
    );

    ctx.fillStyle =
      fallback;

    ctx.fillRect(
      0,
      0,
      width,
      height
    );
  }

  // =========================
  // AVATAR
  // =========================

  const avatar =
    await getAvatar(message);

  const avatarX = 39;
  const avatarY = 58;
  const avatarSize = 168;

  const avatarCenterX =
    avatarX +
    avatarSize / 2;

  const avatarCenterY =
    avatarY +
    avatarSize / 2;

  // Outer black ring.
  ctx.beginPath();

  ctx.arc(
    avatarCenterX,
    avatarCenterY,
    avatarSize / 2 + 3,
    0,
    Math.PI * 2
  );

  ctx.fillStyle =
    "#050505";

  ctx.fill();

  // Clip avatar.
  ctx.save();

  ctx.beginPath();

  ctx.arc(
    avatarCenterX,
    avatarCenterY,
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

    ctx.fillStyle =
      "#4b5259";

    ctx.fillRect(
      avatarX,
      avatarY,
      avatarSize,
      avatarSize
    );
  }

  ctx.restore();

  // =========================
  // STATUS DOT
  // =========================

  const statusX = 183;
  const statusY = 195;
  const statusRadius = 22;

  // Outer black ring.
  ctx.beginPath();

  ctx.arc(
    statusX,
    statusY,
    statusRadius + 3,
    0,
    Math.PI * 2
  );

  ctx.fillStyle =
    "#0a0a0a";

  ctx.fill();

  // Gray status dot.
  ctx.beginPath();

  ctx.arc(
    statusX,
    statusY,
    statusRadius,
    0,
    Math.PI * 2
  );

  ctx.fillStyle =
    "#818991";

  ctx.fill();

  // =========================
  // UG LOGO
  // =========================

  if (ugLogoImage) {

    ctx.save();

    ctx.shadowColor =
      "rgba(0, 0, 0, 0.55)";

    ctx.shadowBlur = 3;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 3;

    ctx.drawImage(
      ugLogoImage,
      298,
      4,
      206,
      131
    );

    ctx.restore();

  } else {

    drawTextWithShadow(
      ctx,
      "UG",
      300,
      104,
      "900 78px Arial",
      "#77736c"
    );
  }

  // =========================
  // RANK
  // =========================

  drawTextWithShadow(
    ctx,
    "RANK",
    509,
    99,
    "28px Arial",
    "#ffffff"
  );

  drawTextWithShadow(
    ctx,
    `#${rank}`,
    570,
    100,
    "58px Arial",
    "#ffffff"
  );

  // =========================
  // LEVEL
  // =========================

  drawTextWithShadow(
    ctx,
    "LEVEL",
    739,
    98,
    "24px Arial",
    "#18dce8"
  );

  drawTextWithShadow(
    ctx,
    String(userData.level),
    810,
    101,
    "56px Arial",
    "#18dce8"
  );

  // =========================
  // USERNAME
  // =========================

  drawTextWithShadow(
    ctx,
    message.author.username,
    274,
    171,
    "36px Arial",
    "#ffffff"
  );

  // =========================
  // XP TEXT
  // =========================

  const needed =
    xpNeeded(
      userData.level
    );

  const currentXP =
    userData.xp;

  const currentText =
    formatXP(currentXP);

  const totalText =
    `${formatXP(needed)} XP`;

  const xpY = 166;

  ctx.save();

  ctx.textBaseline =
    "alphabetic";

  ctx.textAlign =
    "left";

  ctx.font =
    "24px Arial";

  const currentWidth =
    ctx.measureText(
      currentText
    ).width;

  const separator = " / ";

  const separatorWidth =
    ctx.measureText(
      separator
    ).width;

  const totalWidth =
    ctx.measureText(
      totalText
    ).width;

  const xpStartX =
    887 -
    currentWidth -
    separatorWidth -
    totalWidth;

  drawTextWithShadow(
    ctx,
    currentText,
    xpStartX,
    xpY,
    "24px Arial",
    "#ffffff"
  );

  drawTextWithShadow(
    ctx,
    separator,
    xpStartX +
      currentWidth,
    xpY,
    "24px Arial",
    "#5b7796"
  );

  drawTextWithShadow(
    ctx,
    totalText,
    xpStartX +
      currentWidth +
      separatorWidth,
    xpY,
    "24px Arial",
    "#5b7796"
  );

  ctx.restore();

  // =========================
  // XP BAR
  // =========================

  const barX = 256;
  const barY = 183;
  const barWidth = 636;
  const barHeight = 39;
  const barRadius = 20;

  // Outer black border.
  roundedRect(
    ctx,
    barX - 2,
    barY - 2,
    barWidth + 4,
    barHeight + 4,
    barRadius + 2
  );

  ctx.fillStyle =
    "#050505";

  ctx.fill();

  // Gray track.
  roundedRect(
    ctx,
    barX,
    barY,
    barWidth,
    barHeight,
    barRadius
  );

  ctx.fillStyle =
    "#4b5055";

  ctx.fill();

  // XP progress.
  const progress =
    Math.max(
      0,
      Math.min(
        currentXP / needed,
        1
      )
    );

  if (progress > 0) {

    ctx.save();

    roundedRect(
      ctx,
      barX,
      barY,
      barWidth,
      barHeight,
      barRadius
    );

    ctx.clip();

    const progressGradient =
      ctx.createLinearGradient(
        barX,
        barY,
        barX,
        barY + barHeight
      );

    progressGradient.addColorStop(
      0,
      "#68e5d8"
    );

    progressGradient.addColorStop(
      1,
      "#4ed5cd"
    );

    ctx.fillStyle =
      progressGradient;

    ctx.fillRect(
      barX,
      barY,
      barWidth * progress,
      barHeight
    );

    ctx.restore();
  }

  // Final black outline.
  roundedRect(
    ctx,
    barX,
    barY,
    barWidth,
    barHeight,
    barRadius
  );

  ctx.lineWidth = 2;

  ctx.strokeStyle =
    "#050505";

  ctx.stroke();

  return canvas.toBuffer(
    "image/png"
  );
}

// =========================
// DISCORD GATEWAY
// =========================

let ws = null;
let heartbeatInterval = null;
let reconnectTimer = null;
let sequence = null;
let intentionallyClosed = false;

function clearGatewayTimers() {

  if (heartbeatInterval) {

    clearInterval(
      heartbeatInterval
    );

    heartbeatInterval = null;
  }

  if (reconnectTimer) {

    clearTimeout(
      reconnectTimer
    );

    reconnectTimer = null;
  }
}

function scheduleReconnect(
  delay = 5000
) {
  if (
    intentionallyClosed ||
    reconnectTimer
  ) {
    return;
  }

  reconnectTimer =
    setTimeout(() => {

      reconnectTimer = null;

      connectGateway();

    }, delay);
}

function sendHeartbeat() {

  if (
    ws &&
    ws.readyState ===
      WebSocket.OPEN
  ) {

    ws.send(
      JSON.stringify({
        op: 1,
        d: sequence
      })
    );
  }
}

function connectGateway() {

  clearGatewayTimers();

  console.log(
    "CONNECTING TO DISCORD GATEWAY"
  );

  ws = new WebSocket(
    "wss://gateway.discord.gg/?v=10&encoding=json"
  );

  ws.on(
    "open",
    () => {

      console.log(
        "DISCORD GATEWAY CONNECTED"
      );
    }
  );

  ws.on(
    "message",
    async (data) => {

      let packet;

      try {

        packet =
          JSON.parse(
            data.toString()
          );

      } catch (error) {

        console.error(
          "GATEWAY JSON ERROR:",
          error.message
        );

        return;
      }

      if (
        packet.s !== null &&
        packet.s !== undefined
      ) {

        sequence =
          packet.s;
      }

      // =========================
      // HELLO
      // =========================

      if (packet.op === 10) {

        clearInterval(
          heartbeatInterval
        );

        const interval =
          packet.d.heartbeat_interval;

        heartbeatInterval =
          setInterval(
            sendHeartbeat,
            interval
          );

        sendHeartbeat();

        const intents =
          1 |       // GUILDS
          512 |     // GUILD_MESSAGES
          32768;    // MESSAGE_CONTENT

        ws.send(
          JSON.stringify({
            op: 2,

            d: {
              token,

              intents,

              properties: {
                os: "linux",
                browser:
                  "B.T.N.L System",
                device:
                  "B.T.N.L System"
              }
            }
          })
        );

        console.log(
          "IDENTIFY SENT"
        );
      }

      // =========================
      // RECONNECT REQUEST
      // =========================

      if (packet.op === 7) {

        console.log(
          "DISCORD REQUESTED RECONNECT"
        );

        if (
          ws.readyState ===
          WebSocket.OPEN
        ) {

          ws.close(
            1000,
            "Reconnect requested"
          );
        }

        return;
      }

      // =========================
      // INVALID SESSION
      // =========================

      if (packet.op === 9) {

        console.log(
          "DISCORD INVALID SESSION"
        );

        if (
          ws.readyState ===
          WebSocket.OPEN
        ) {

          ws.close(
            1000,
            "Invalid session"
          );
        }

        return;
      }

      // =========================
      // READY
      // =========================

      if (
        packet.t ===
        "READY"
      ) {

        console.log(
          "BOT ONLINE:",
          packet.d.user.username
        );
      }

      // =========================
      // NEW MESSAGE
      // =========================

      if (
        packet.t ===
        "MESSAGE_CREATE"
      ) {

        const message =
          packet.d;

        if (
          message.author?.bot
        ) {
          return;
        }

        // Random XP 0-100.
        const user =
          getUser(
            message.author.id
          );

        const gainedXP =
          Math.floor(
            Math.random() * 101
          );

        user.xp +=
          gainedXP;

        // Level up.
        while (
          user.xp >=
          xpNeeded(
            user.level
          )
        ) {

          user.xp -=
            xpNeeded(
              user.level
            );

          user.level++;

          console.log(
            `${message.author.username} reached level ${user.level}`
          );
        }

        // =========================
        // !rank
        // =========================

        if (
          message.content
            ?.toLowerCase()
            .trim() ===
          "!rank"
        ) {

          console.log(
            "!rank USED BY:",
            message.author.username
          );

          const allUsers =
            [
              ...users.entries()
            ];

          allUsers.sort(
            (a, b) => {

              if (
                b[1].level !==
                a[1].level
              ) {

                return (
                  b[1].level -
                  a[1].level
                );
              }

              return (
                b[1].xp -
                a[1].xp
              );
            }
          );

          const rankIndex =
            allUsers.findIndex(
              ([id]) =>
                id ===
                message.author.id
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
    }
  );

  ws.on(
    "error",
    (error) => {

      console.error(
        "WEBSOCKET ERROR:",
        error.message
      );
    }
  );

  ws.on(
    "close",
    (code, reason) => {

      clearInterval(
        heartbeatInterval
      );

      heartbeatInterval =
        null;

      console.log(
        "WEBSOCKET CLOSED:",
        code,
        reason.toString()
      );

      scheduleReconnect(5000);
    }
  );
}

// Start Discord connection.
connectGateway();

// =========================
// CLEAN SHUTDOWN
// =========================

process.on(
  "SIGTERM",
  () => {

    intentionallyClosed =
      true;

    clearGatewayTimers();

    if (
      ws &&
      ws.readyState ===
        WebSocket.OPEN
    ) {

      ws.close(
        1000,
        "Render shutdown"
      );
    }

    server.close(
      () => {
        process.exit(0);
      }
    );
  }
);

process.on(
  "SIGINT",
  () => {

    intentionallyClosed =
      true;

    clearGatewayTimers();

    if (
      ws &&
      ws.readyState ===
        WebSocket.OPEN
    ) {

      ws.close(
        1000,
        "Process shutdown"
      );
    }

    server.close(
      () => {
        process.exit(0);
      }
    );
  }
);
