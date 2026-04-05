if (process.env.NODE_ENV !== "production") {
    require("dotenv").config();
  }
  
  const {
    REST,
    Routes,
    SlashCommandBuilder,
  } = require("discord.js");
  
  // ─── Shared messages ──────────────────────────────────────────
  
  const SIGNUP_NUDGE =
    "✨ Looks like you don't have an Inkwell account yet — but you're so close!\n\n" +
    "Sign up takes just a minute, and once you're in you'll be able to sprint, " +
    "track your word count, and write alongside this whole community 🌱\n\n" +
    "**Create your free account here:**\nhttps://inkwellinky.vercel.app/signup";
  
  // ─── Command definitions ──────────────────────────────────────
  
  const commands = [
    new SlashCommandBuilder()
      .setName("start")
      .setDescription("Kick off a group sprint on Inkwell")
      .addIntegerOption((opt) =>
        opt
          .setName("duration")
          .setDescription("How many minutes? (e.g. 15, 30, 60)")
          .setRequired(true)
          .setMinValue(5)
          .setMaxValue(180)
      ),
  
    new SlashCommandBuilder()
      .setName("join")
      .setDescription("Join the active sprint on Inkwell")
      .addIntegerOption((opt) =>
        opt
          .setName("words")
          .setDescription("Your starting word count (optional)")
          .setRequired(false)
          .setMinValue(0)
      ),
  ].map((cmd) => cmd.toJSON());
  
  // ─── Register with Discord ────────────────────────────────────
  
  async function registerCommands() {
    const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_BOT_TOKEN);
    try {
      console.log("📋 Registering slash commands...");
      await rest.put(
        Routes.applicationGuildCommands(
          process.env.DISCORD_CLIENT_ID,
          process.env.DISCORD_GUILD_ID
        ),
        { body: commands }
      );
      console.log("✅ Slash commands registered");
    } catch (err) {
      console.error("❌ Failed to register slash commands:", err);
    }
  }
  
  // ─── Main interaction router ──────────────────────────────────
  
  async function handleSlashCommand(interaction) {
    if (!interaction.isChatInputCommand()) return;
  
    if (interaction.commandName === "start") return handleStart(interaction);
    if (interaction.commandName === "join") return handleJoin(interaction);
  }
  
  // ─── /start ──────────────────────────────────────────────────
  // Bot rallies the community — the actual sprint is started on the website.
  // Once started on Inkwell, your backend calls POST /notify/sprint-started
  // on the bot server, which posts the full embed with the real sprint link.
  
  async function handleStart(interaction) {
    const duration = interaction.options.getInteger("duration");
  
    await interaction.reply(
      `✍️ **${interaction.user.displayName}** wants to kick off a **${duration}-min sprint!**\n\n` +
        `Log in to Inkwell to start it — once you do, the sprint link will appear here for everyone to join 🌱\n` +
        `https://inkwellinky.vercel.app`
    );
  }
  
  // ─── /join ───────────────────────────────────────────────────
  // Bot posts the hype message — actual joining + soundscape picker is on Inkwell.
  // Once the member joins on the site, your backend calls POST /notify/sprint-started
  // which posts the sprint link so others can follow.
  
  async function handleJoin(interaction) {
    const startWords = interaction.options.getInteger("words") ?? 0;
    const wordNote = startWords > 0 ? ` (starting at ${startWords} words)` : "";
  
    await interaction.reply(
      `🖊️ **${interaction.user.displayName}** is joining the sprint${wordNote} — sending you positive vibes! 🌱\n\n` +
        `Head to Inkwell to join and pick your soundscape:\n` +
        `https://inkwellinky.vercel.app`
    );
  }
  
  module.exports = { registerCommands, handleSlashCommand };