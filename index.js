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

// ============================================================
// BACKGROUND
// ============================================================

const backgroundPath = path.join(
  __dirname,
  "background.jpeg"
);

let backgroundImage = null;

async function loadBackground() {
  try {
    if (!fs.existsSync(backgroundPath)) {
      console.error(
        "ERROR: background.jpeg is missing from the project."
      );
      return;
    }

    backgroundImage =
      await loadImage(backgroundPath);

    console.log(
      "BACKGROUND LOADED SUCCESSFULLY"
    );

  } catch (error) {
    console.error(
      "BACKGROUND LOAD ERROR:",
      error.message
    );
  }
}

// ============================================================
// USER DATA
// ============================================================

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
    return (
      (value / 1000000)
        .toFixed(2)
        .replace(/0+$/, "")
        .replace(/\.$/, "") +
      "M"
    );
  }

  if (value >= 1000) {
    return (
      (value / 1000)
        .toFixed(2)
        .replace(/0+$/, "")
        .replace(/\.$/, "") +
      "K"
    );
  }

  return String(value);
}

// ============================================================
// AVATAR CACHE
// ============================================================

const avatarCache = new Map();

const AVATAR_CACHE_TIME =
  5 * 60 * 1000;

async function getAvatar(message) {
  const avatarHash =
    message.author?.avatar;

  if (!avatarHash) {
    return null;
  }

  const cacheKey =
    `${message.author.id}:${avatarHash}`;

  const cached =
    avatarCache.get(cacheKey);

  if (
    cached &&
    Date.now() - cached.time <
      AVATAR_CACHE_TIME
  ) {
    return cached.image;
  }

  try {
    const image =
      await loadImage(
        `https://cdn.discordapp.com/avatars/${message.author.id}/${avatarHash}.png?size=256`
      );

    avatarCache.set(
      cacheKey,
      {
        image,
        time: Date.now()
      }
    );

    return image;

  } catch (error) {
    console.error(
      "AVATAR LOAD FAILED:",
      error.message
    );

    return null;
  }
}

// ============================================================
// RENDER WEB SERVER
// ============================================================

const server =
  http.createServer(
    (req, res) => {

      res.writeHead(
        200,
        {
          "Content-Type":
            "text/plain; charset=utf-8",

          "Cache-Control":
            "no-store"
        }
      );

      res.end(
        "B.T.N.L System is running!"
      );
    }
  );

server.listen(
  process.env.PORT || 10000,
  "0.0.0.0",
  () => {
    console.log(
      "WEB SERVER STARTED"
    );
  }
);

// ============================================================
// SEND IMAGE TO DISCORD
// ============================================================

async function sendRankCard(
  channelId,
  imageBuffer
) {
  try {

    const form =
      new FormData();

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
      new Blob(
        [imageBuffer],
        {
          type: "image/png"
        }
      ),
      "rank.png"
    );

    const response =
      await fetch(
        `https://discord.com/api/v10/channels/${channelId}/messages`,
        {
          method: "POST",

          headers: {
            Authorization:
              `Bot ${token}`,

            "User-Agent":
              "B.T.N.L System/1.0"
          },

          body: form
        }
      );

    console.log(
      "DISCORD API STATUS:",
      response.status
    );

    // Discord rate limit
    if (response.status === 429) {

      const retryAfter =
        response.headers.get(
          "retry-after"
        );

      console.error(
        "DISCORD RATE LIMITED."
      );

      console.error(
        "RETRY AFTER:",
        retryAfter,
        "seconds"
      );

      return false;
    }

    const responseText =
      await response.text();

    console.log(
      "DISCORD RESPONSE:",
      responseText.substring(
        0,
        300
      )
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

// ============================================================
// DRAW COVER BACKGROUND
// ============================================================

function drawCover(
  ctx,
  image,
  width,
  height
) {
  const scale =
    Math.max(
      width / image.width,
      height / image.height
    );

  const drawWidth =
    image.width * scale;

  const drawHeight =
    image.height * scale;

  const x =
    (width - drawWidth) / 2;

  const y =
    (height - drawHeight) / 2;

  ctx.drawImage(
    image,
    x,
    y,
    drawWidth,
    drawHeight
  );
}

// ============================================================
// ROUNDED RECTANGLE
// ============================================================

function roundedRect(
  ctx,
  x,
  y,
  width,
  height,
  radius
) {
  const r =
    Math.min(
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

// ============================================================
// TEXT WITH SHADOW
// ============================================================

function drawText(
  ctx,
  text,
  x,
  y,
  font,
  color,
  align = "left"
) {
  ctx.save();

  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = "alphabetic";

  ctx.shadowColor =
    "rgba(0, 0, 0, 0.65)";

  ctx.shadowBlur = 2;
  ctx.shadowOffsetX = 1;
  ctx.shadowOffsetY = 2;

  ctx.fillText(
    text,
    x,
    y
  );

  ctx.restore();
}

// ============================================================
// CREATE MEE6-STYLE RANK CARD
// ============================================================

async function createRankCard(
  message,
  userData,
  rank
) {
  const width = 934;
  const height = 282;

  const canvas =
    createCanvas(
      width,
      height
    );

  const ctx =
    canvas.getContext("2d");

  // ========================================================
  // VOLCANO BACKGROUND
  // ========================================================

  if (backgroundImage) {

    ctx.save();

    // Slight blur — NOT heavily blurred.
    ctx.filter =
      "blur(1.2px)";

    drawCover(
      ctx,
      backgroundImage,
      width,
      height
    );

    ctx.restore();

  } else {

    // Fallback only if the image is missing.
    const fallback =
      ctx.createLinearGradient(
        0,
        0,
        width,
        height
      );

    fallback.addColorStop(
      0,
      "#332020"
    );

    fallback.addColorStop(
      1,
      "#15171d"
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

  // ========================================================
  // VERY LIGHT DARK OVERLAY
  // ========================================================

  ctx.fillStyle =
    "rgba(0, 0, 0, 0.08)";

  ctx.fillRect(
    0,
    0,
    width,
    height
  );

  // ========================================================
  // AVATAR
  // ========================================================

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

  // Black outer ring
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

  // Avatar circle
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
      "#555b62";

    ctx.fillRect(
      avatarX,
      avatarY,
      avatarSize,
      avatarSize
    );
  }

  ctx.restore();

  // ========================================================
  // STATUS DOT
  // ========================================================

  const statusX = 183;
  const statusY = 195;
  const statusRadius = 22;

  // Black outline
  ctx.beginPath();

  ctx.arc(
    statusX,
    statusY,
    statusRadius + 3,
    0,
    Math.PI * 2
  );

  ctx.fillStyle =
    "#080808";

  ctx.fill();

  // Gray status
  ctx.beginPath();

  ctx.arc(
    statusX,
    statusY,
    statusRadius,
    0,
    Math.PI * 2
  );

  ctx.fillStyle =
    "#858e96";

  ctx.fill();

  // ========================================================
  // IMPORTANT:
  // NO UG TEXT / NO UG LOGO
  // ========================================================

  // ========================================================
  // RANK
  // ========================================================

  drawText(
    ctx,
    "RANK",
    509,
    99,
    "28px Arial",
    "#ffffff"
  );

  drawText(
    ctx,
    `#${rank}`,
    570,
    100,
    "58px Arial",
    "#ffffff"
  );

  // ========================================================
  // LEVEL
  // ========================================================

  drawText(
    ctx,
    "LEVEL",
    739,
    98,
    "24px Arial",
    "#18dce8"
  );

  drawText(
    ctx,
    String(userData.level),
    809,
    101,
    "56px Arial",
    "#18dce8"
  );

  // ========================================================
  // USERNAME
  // ========================================================

  drawText(
    ctx,
    message.author.username,
    274,
    171,
    "36px Arial",
    "#ffffff"
  );

  // ========================================================
  // XP
  // ========================================================

  const needed =
    xpNeeded(
      userData.level
    );

  const currentXP =
    userData.xp;

  const currentText =
    formatXP(
      currentXP
    );

  const totalText =
    `${formatXP(needed)} XP`;

  ctx.font =
    "24px Arial";

  const separator =
    " / ";

  const currentWidth =
    ctx.measureText(
      currentText
    ).width;

  const separatorWidth =
    ctx.measureText(
      separator
    ).width;

  const totalWidth =
    ctx.measureText(
      totalText
    ).width;

  const totalTextWidth =
    currentWidth +
    separatorWidth +
    totalWidth;

  const xpStartX =
    887 -
    totalTextWidth;

  drawText(
    ctx,
    currentText,
    xpStartX,
    166,
    "24px Arial",
    "#ffffff"
  );

  drawText(
    ctx,
    separator,
    xpStartX +
      currentWidth,
    166,
    "24px Arial",
    "#6b89a8"
  );

  drawText(
    ctx,
    totalText,
    xpStartX +
      currentWidth +
      separatorWidth,
    166,
    "24px Arial",
    "#6b89a8"
  );

  // ========================================================
  // XP BAR
  // ========================================================

  const barX = 256;
  const barY = 183;
  const barWidth = 636;
  const barHeight = 39;
  const barRadius = 20;

  // Black border
  roundedRect(
    ctx,
    barX - 2,
    barY - 2,
    barWidth + 4,
    barHeight + 4,
    barRadius + 2
  );

  ctx.fillStyle =
    "#030303";

  ctx.fill();

  // Gray track
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

  // Progress
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
      "#69e5d8"
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

  // Final outline
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

// ============================================================
// DISCORD GATEWAY
// ============================================================

let ws = null;
let heartbeatInterval = null;
let reconnectTimer = null;
let sequence = null;
let shuttingDown = false;

function clearTimers() {

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

function scheduleReconnect() {

  if (
    shuttingDown ||
    reconnectTimer
  ) {
    return;
  }

  reconnectTimer =
    setTimeout(
      () => {

        reconnectTimer = null;

        connectGateway();

      },
      5000
    );
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

  clearTimers();

  console.log(
    "CONNECTING TO DISCORD GATEWAY"
  );

  ws =
    new WebSocket(
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

      // ======================================================
      // HELLO
      // ======================================================

      if (packet.op === 10) {

        if (
          heartbeatInterval
        ) {

          clearInterval(
            heartbeatInterval
          );
        }

        heartbeatInterval =
          setInterval(
            sendHeartbeat,
            packet.d.heartbeat_interval
          );

        sendHeartbeat();

        const intents =
          1 |
          512 |
          32768;

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

      // ======================================================
      // RECONNECT
      // ======================================================

      if (packet.op === 7) {

        console.log(
          "DISCORD REQUESTED RECONNECT"
        );

        ws.close();

        return;
      }

      // ======================================================
      // INVALID SESSION
      // ======================================================

      if (packet.op === 9) {

        console.log(
          "DISCORD INVALID SESSION"
        );

        ws.close();

        return;
      }

      // ======================================================
      // READY
      // ======================================================

      if (
        packet.t ===
        "READY"
      ) {

        console.log(
          "BOT ONLINE:",
          packet.d.user.username
        );
      }

      // ======================================================
      // MESSAGE
      // ======================================================

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

        // ====================================================
        // XP
        // ====================================================

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

        // ====================================================
        // LEVEL UP
        // ====================================================

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

        // ====================================================
        // !RANK
        // ====================================================

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

      if (
        heartbeatInterval
      ) {

        clearInterval(
          heartbeatInterval
        );

        heartbeatInterval =
          null;
      }

      console.log(
        "WEBSOCKET CLOSED:",
        code,
        reason.toString()
      );

      scheduleReconnect();
    }
  );
}

// ============================================================
// START
// ============================================================

(async () => {

  await loadBackground();

  connectGateway();

})();
