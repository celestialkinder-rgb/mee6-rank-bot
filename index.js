const http = require("http");
const { Client, GatewayIntentBits } = require("discord.js");

const token = process.env.DISCORD_TOKEN;

console.log("DISCORD_TOKEN available:", Boolean(token));
console.log("DISCORD_TOKEN length:", token ? token.length : 0);

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

const server = http.createServer((req, res) => {
  res.writeHead(200);
  res.end("Bot is running!");
});

server.listen(process.env.PORT || 10000, "0.0.0.0", () => {
  console.log("Web server started");
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

client.once("ready", (client) => {
  console.log("DISCORD READY:", client.user.tag);
});

client.login(token)
  .then(() => console.log("LOGIN PROMISE COMPLETED"))
  .catch((error) => console.error("LOGIN FAILED:", error));
