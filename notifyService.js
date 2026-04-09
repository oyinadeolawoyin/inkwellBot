// notifyService.js  (bot side — sends messages to the Discord channel)

let _client = null;
let _sprintChannel = null;

// Call this once from your index.js after the client is ready:
//   const { setClient } = require("./notifyService");
//   client.once("ready", () => setClient(client));
function setClient(client) {
  _client = client;
}

// ─── Internal helpers ─────────────────────────────────────────

async function getSprintChannel() {
  if (_sprintChannel) return _sprintChannel;
  if (!_client) {
    throw new Error("notifyService: client not set — call setClient(client) on ready");
  }
  _sprintChannel = await _client.channels.fetch(process.env.DISCORD_SPRINT_CHANNEL_ID);
  return _sprintChannel;
}

// send() — plain message, no ping
async function send(text) {
  const channel = await getSprintChannel();
  await channel.send({ content: text });
}

// sendWithEveryonePing() — @everyone that actually pings
async function sendWithEveryonePing(text) {
  const channel = await getSprintChannel();
  await channel.send({
    content: `@everyone\n${text}`,
    allowedMentions: { parse: ["everyone"] },
  });
}

// ─── Notify functions (called by server.js endpoints) ─────────

// @everyone ping — sprint started (from site OR bot /start)
async function notifyGroupSprintStarted({ username, duration, groupSprintId }) {
  const link = `https://inkwellinky.vercel.app/group-sprint/${groupSprintId}`;
  await sendWithEveryonePing(
    `✍️ **${username}** just kicked off a **${duration}-min sprint** on Inkwell!\n\n` +
    `Join them and write together 🌱\n${link}`
  );
}

// @everyone ping — sprint fully ended, with total word count
async function notifyGroupSprintEnded({ groupSprintId, totalWordsWritten }) {
  const link = `https://inkwellinky.vercel.app/group-sprint/${groupSprintId}`;
  const wordDisplay = totalWordsWritten
    ? `**${totalWordsWritten.toLocaleString()} words** written in total`
    : "some amazing work";
  await sendWithEveryonePing(
    `🏁 The sprint is over — incredible work everyone!\n\n` +
    `The group smashed out ${wordDisplay} 🎉\n` +
    `Check out how everyone did:\n${link}`
  );
}

// Quiet message — member joined from the site
async function notifyMemberCheckedIn({ username, startWords, groupSprintId }) {
  const link = `https://inkwellinky.vercel.app/group-sprint/${groupSprintId}`;
  const wordNote = startWords > 0 ? ` (starting at ${startWords} words)` : "";
  await send(
    `🖊️ **${username}** just joined the sprint from Inkwell${wordNote} — sending positive vibes! 🌱\n` +
    `Come write together:\n${link}`
  );
}

// Quiet message — member submitted their word count
async function notifyMemberCheckedOut({ username, wordsWritten, groupSprintId }) {
  const link = `https://inkwellinky.vercel.app/group-sprint/${groupSprintId}`;
  const wordNote = wordsWritten > 0 ? ` and wrote **${wordsWritten} words**` : "";
  await send(
    `✅ **${username}** just checked out of the sprint${wordNote}! Great work 🌱\n${link}`
  );
}

module.exports = {
  setClient,
  notifyGroupSprintStarted,
  notifyGroupSprintEnded,
  notifyMemberCheckedIn,
  notifyMemberCheckedOut,
};