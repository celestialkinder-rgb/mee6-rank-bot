const http = require("http");
const { Client, GatewayIntentBits } = require("discord.js");

const token = process.env.DISCORD_TOKEN;

console.log("DISCORD_TOKEN available:", Boolean(token));
console.log("DISCORD_TOKEN length:", token ? token.length : 0);

if (!token) {
  console.error("DISCORD_TOKEN is missing from the running service.");
  process.exit(1);
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

// Render web server
const server = http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("Bot is running!");
});

server.listen(process.env.PORT || 10000, "0.0.0.0", () => {
  console.log("Web server started");
});

client.once("ready", (readyClient) => {
  console.log(`DISCORD READY: ${readyClient.user.tag}`);
});

client.on("error", (error) => {
  console.error("DISCORD CLIENT ERROR:", error);
});

client.on("shardError", (error) => {
  console.error("DISCORD SHARD ERROR:", error);
});

client.login(token)
  .then(() => {
    console.log("DISCORD LOGIN COMPLETED");
  })
  .catch((error) => {
    console.error("DISCORD LOGIN FAILED:", error.message);
  });
