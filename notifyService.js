const { EmbedBuilder } = require("discord.js");
const { sendBotMessage } = require("./botClient");

// ─── Sprint started ───────────────────────────────────────────

async function notifyGroupSprintStarted({ username, duration, soundscape, groupSprintId }) {
  const embed = new EmbedBuilder()
    .setColor(0x4ade80)
    .setTitle("✍️ A Group Sprint just started!")
    .setDescription(`**${username}** kicked off a sprint. Come write together!`)
    .addFields(
      { name: "⏱ Duration", value: `${duration} mins`, inline: true },
      { name: "🎵 Soundscape", value: soundscape || "Pick yours when you join", inline: true }
    )
    .setURL(`https://inkwellinky.vercel.app/group-sprint/${groupSprintId}`)
    .setTimestamp();

  await sendBotMessage(process.env.DISCORD_CHANNEL_ID, embed);
}

// ─── Sprint ended — fetches member list and tags everyone ─────

async function notifyGroupSprintEnded({ username, groupSprintId, totalWordsWritten }) {
  let mentionLine = "";

  try {
    // Uses bot secret now — no JWT needed, and discordId is included in the user select
    const res = await fetch(
      `${process.env.INKWELL_API_URL}/group-sprints/bot/${groupSprintId}`,
      {
        headers: { "x-bot-secret": process.env.BOT_SECRET },
      }
    );

    if (res.ok) {
      const { groupSprint } = await res.json();

      if (groupSprint?.sprints?.length > 0) {
        const mentions = groupSprint.sprints.map((s) => {
          if (s.user?.discordId) {
            // Properly mention them in Discord — they'll get a ping
            return `<@${s.user.discordId}>`;
          }
          // Fallback for site-only users with no Discord linked
          return `**${s.user?.username ?? "a writer"}**`;
        });

        mentionLine = mentions.join(" ");
      }
    }
  } catch (err) {
    console.error("Failed to fetch sprint members for tagging:", err);
    // Non-fatal — notification still sends, just without mentions
  }

  const embed = new EmbedBuilder()
    .setColor(0xf97316)
    .setTitle("🏁 Sprint's a wrap!")
    .setDescription(
      `**${username}**'s sprint just ended. Amazing work everyone who showed up! 🌱\n\n` +
      (mentionLine
        ? `${mentionLine}\n\nThe sprint has come to an end — please log in your word count to check out!`
        : "The sprint has come to an end — please log in your word count to check out!")
    )
    .setURL(`https://inkwellinky.vercel.app/group-sprint/${groupSprintId}`)
    .setTimestamp();

  await sendBotMessage(process.env.DISCORD_CHANNEL_ID, embed);
}

// ─── Member checked out — posts to daily drop channel ────────

async function notifyMemberCheckedOut({ username, wordsWritten, groupSprintId }) {
  const now = new Date();
  const day = now.getDate();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const year = String(now.getFullYear()).slice(-2);
  const dateStr = `${day}/${month}/${year}`;

  const embed = new EmbedBuilder()
    .setColor(0x818cf8)
    .setAuthor({ name: username })
    .setDescription(`${dateStr} 💧 (${wordsWritten ?? 0})`)
    .setURL(`https://inkwellinky.vercel.app/group-sprint/${groupSprintId}`)
    .setTimestamp();

  await sendBotMessage(process.env.DISCORD_DAILY_DROP_CHANNEL_ID, embed);
}

module.exports = {
  notifyGroupSprintStarted,
  notifyGroupSprintEnded,
  notifyMemberCheckedOut,
};