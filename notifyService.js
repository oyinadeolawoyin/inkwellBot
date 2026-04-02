const { EmbedBuilder } = require("discord.js");
const { sendBotMessage } = require("./botClient");

async function notifyGroupSprintStarted({ username, duration, soundscape, groupSprintId }) {
  const embed = new EmbedBuilder()
    .setColor(0x4ade80)
    .setTitle("✍️ A Group Sprint just started!")
    .setDescription(`**${username}** kicked off a sprint. Come write together!`)
    .addFields(
      { name: "⏱ Duration", value: `${duration} mins`, inline: true },
      { name: "🎵 Soundscape", value: soundscape || "None", inline: true },
    )
    .setURL(`https://inkwellinky.vercel.app/group-sprint/${groupSprintId}`)
    .setTimestamp();

  await sendBotMessage(process.env.DISCORD_CHANNEL_ID, embed);
}

async function notifyGroupSprintEnded({ username, groupSprintId, totalWordsWritten }) {
  const embed = new EmbedBuilder()
    .setColor(0xf97316)
    .setTitle("🏁 Group Sprint wrapped up!")
    .setDescription(`**${username}**'s sprint just ended.`)
    .addFields(
      { name: "📝 Total Words Written", value: `${totalWordsWritten ?? 0}`, inline: true },
    )
    .setURL(`https://inkwellinky.vercel.app/group-sprint/${groupSprintId}`)
    .setTimestamp();

  await sendBotMessage(process.env.DISCORD_CHANNEL_ID, embed);
}

module.exports = { notifyGroupSprintStarted, notifyGroupSprintEnded };