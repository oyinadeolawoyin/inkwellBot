require("dotenv").config();
console.log("🔥 discordBot.js is running");
const { Client, GatewayIntentBits } = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

client.once("ready", () => {
  console.log(`🤖 Bot logged in as ${client.user.tag}`);
});

console.log("TOKEN EXISTS?", !!process.env.DISCORD_BOT_TOKEN);
async function loginWithTimeout(timeout = 10000) {
  return Promise.race([
    client.login(process.env.DISCORD_BOT_TOKEN),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Login timeout")), timeout)
    )
  ]);
}

async function loginWithRetry(retries = 5) {
  try {
    console.log("🔌 Attempting to connect to Discord...");
    await loginWithTimeout();
    console.log("🚀 Login attempt sent");
  } catch (err) {
    console.error("❌ Login failed:", err.message);

    if (retries > 0) {
      console.log(`🔄 Retrying in 5s... (${retries})`);
      await new Promise(res => setTimeout(res, 5000));
      return loginWithRetry(retries - 1);
    } else {
      console.error("💀 Could not connect to Discord");
    }
  }
}

// 🚀 START THE BOT (you missed this before)
setTimeout(() => {
  loginWithRetry();
}, 5000);

// 👇 Wait for bot readiness
async function waitForReady() {
  if (client.isReady()) return;
  await new Promise(resolve => client.once("ready", resolve));
}

async function sendBotMessage(channelId, embed) {
  await waitForReady();

  try {
    const channel = await client.channels.fetch(channelId);
    if (!channel) return console.error("Channel not found");

    await channel.send({ embeds: [embed] });
  } catch (err) {
    console.error("Bot send error:", err);
  }
}

module.exports = { sendBotMessage };