// notifyService.js  (bot side — sends messages to the Discord channel)

let _client = null;
let _sprintChannel = null;

// ─── Init ─────────────────────────────────────────────────────
// Call once from index.js after client is ready:
//   const { setClient } = require("./notifyService");
//   client.once("ready", () => setClient(client));

function setClient(client) {
  _client = client;
  _sprintChannel = null; // reset cached channel on reconnect
}

// ─── Internal helpers ─────────────────────────────────────────

async function getSprintChannel() {
  if (_sprintChannel) return _sprintChannel;
  if (!_client) throw new Error("notifyService: client not set — call setClient(client) on ready");
  _sprintChannel = await _client.channels.fetch(process.env.DISCORD_SPRINT_CHANNEL_ID);
  return _sprintChannel;
}

// Sends a message to the sprint channel.
// Pass pingEveryone: true to actually trigger an @everyone mention.
async function send(text, { pingEveryone = false } = {}) {
  const channel = await getSprintChannel();
  await channel.send({
    content: pingEveryone ? `@everyone\n${text}` : text,
    allowedMentions: pingEveryone
      ? { parse: ["everyone"] }   // enables the actual ping
      : { parse: [] },            // no pings for quieter messages
  });
}

// ─── Notify functions (called by server.js HTTP endpoints) ────

async function notifyGroupSprintStarted({ username, duration, groupSprintId }) {
  const link = `https://inkwellinky.vercel.app/group-sprint/${groupSprintId}`;
  await send(
    `✍️ **${username}** just kicked off a **${duration}-min sprint** on Inkwell!\n\n` +
    `Come join them and write together 🌱\n${link}`,
    { pingEveryone: true }
  );
}

async function notifyGroupSprintEnded({ groupSprintId, totalWordsWritten }) {
  const link = `https://inkwellinky.vercel.app/group-sprint/${groupSprintId}`;
  const wordDisplay = totalWordsWritten
    ? `**${Number(totalWordsWritten).toLocaleString()} words** written in total`
    : "an incredible sprint";
  await send(
    `🏁 The sprint is over — incredible work everyone!\n\n` +
    `The group smashed out ${wordDisplay} 🎉\n` +
    `See how everyone did:\n${link}`,
    { pingEveryone: true }
  );
}

async function notifyMemberCheckedIn({ username, startWords, groupSprintId }) {
  const link = `https://inkwellinky.vercel.app/group-sprint/${groupSprintId}`;
  const wordNote = startWords > 0 ? ` (starting at **${startWords}** words)` : "";
  await send(
    `🖊️ **${username}** just joined the sprint from Inkwell${wordNote} — sending positive vibes! 🌱\n` +
    `Come write together:\n${link}`
    // no @everyone — quieter, just a heads-up
  );
}

async function notifyMemberCheckedOut({ username, wordsWritten, groupSprintId }) {
  const link = `https://inkwellinky.vercel.app/group-sprint/${groupSprintId}`;
  const wordNote = wordsWritten > 0 ? ` and wrote **${wordsWritten} words**` : "";
  await send(
    `✅ **${username}** just checked out of the sprint${wordNote}! Great work 🌱\n${link}`
    // no @everyone — quieter, just a heads-up
  );
}

module.exports = {
  setClient,
  notifyGroupSprintStarted,
  notifyGroupSprintEnded,
  notifyMemberCheckedIn,
  notifyMemberCheckedOut,
};