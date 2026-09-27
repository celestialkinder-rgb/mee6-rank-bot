const http = require("http");
const { Client, GatewayIntentBits } = require("discord.js");

const token = process.env.DISCORD_TOKEN;

console.log("TOKEN EXISTS:", Boolean(token));
console.log("TOKEN LENGTH:", token ? token.length : 0);

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const server = http.createServer((req, res) => {
  res.writeHead(200);
  res.end("B.T.N.L System is running!");
});

server.listen(process.env.PORT || 10000, "0.0.0.0", () => {
  console.log("WEB SERVER STARTED");
});

client.once("ready", () => {
  console.log(`BOT ONLINE: ${client.user.tag}`);
});

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  if (message.content.toLowerCase() === "!rank") {
    await message.reply("Rank card test working!");
  }
});

client.on("debug", (message) => {
  console.log("DISCORD DEBUG:", message);
});

client.on("warn", (message) => {
  console.warn("DISCORD WARNING:", message);
});

client.on("error", (error) => {
  console.error("DISCORD ERROR:", error);
});

console.log("ABOUT TO LOGIN");

client.login(token)
  .then(() => {
    console.log("LOGIN PROMISE COMPLETED");
  })
  .catch((error) => {
    console.error("LOGIN FAILED:", error);
  });
