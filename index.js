const http = require("http");
const { Client, GatewayIntentBits } = require("discord.js");

const token = process.env.DISCORD_TOKEN;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// Keep Render's web service alive
const server = http.createServer((req, res) => {
  res.writeHead(200);
  res.end("B.T.N.L System is running!");
});

server.listen(process.env.PORT || 10000, "0.0.0.0", () => {
  console.log("WEB SERVER STARTED");
});

// Bot becomes ready
client.once("ready", () => {
  console.log(`BOT ONLINE: ${client.user.tag}`);
});

// !rank command
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  if (message.content.toLowerCase() === "!rank") {
    await message.reply("Rank card test working!");
  }
});

// Login to Discord
console.log("ABOUT TO LOGIN");

client.login(token)
  .then(() => console.log("LOGIN SUCCESSFUL"))
  .catch((error) => console.error("LOGIN FAILED:", error));
