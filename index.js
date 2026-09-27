const http = require("http");
const { Client, GatewayIntentBits } = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds
  ]
});

// Render needs an open web port
const server = http.createServer((req, res) => {
  res.writeHead(200);
  res.end("Bot is online!");
});

server.listen(process.env.PORT || 3000, () => {
  console.log("Web server started");
});

// Discord bot
client.once("ready", () => {
  console.log(`Logged in as ${client.user.tag}`);
});

// Show the actual login error in Render logs
client.login(process.env.DISCORD_TOKEN).catch(error => {
  console.error("DISCORD LOGIN ERROR:", error);
});
