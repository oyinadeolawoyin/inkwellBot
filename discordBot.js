if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

console.log("🔥 discordBot.js is running");

const { loginWithRetry } = require("./botClient");
const { startServer } = require("./server");

// Start HTTP server immediately
startServer();

// Start Discord bot after short delay
setTimeout(() => loginWithRetry(), 5000);