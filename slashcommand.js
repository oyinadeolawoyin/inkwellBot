if (process.env.NODE_ENV !== "production") {
    require("dotenv").config();
  }
  
  const {
    REST,
    Routes,
    SlashCommandBuilder,
    ActionRowBuilder,
    StringSelectMenuBuilder,
  } = require("discord.js");
  
  // ─── Shared messages ──────────────────────────────────────────
  
  const LINK_REQUIRED_MSG =
    "⚠️ You already have an Inkwell account with this username!\n\n" +
    "Link your Discord in your settings so we know it's you:\n" +
    "https://inkwellinky.vercel.app/settings\n\n" +
    "Once linked, your sprints will save automatically 🌱";
  
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
  
    new SlashCommandBuilder()
      .setName("myid")
      .setDescription("Get your Discord ID to link your Inkwell account"),
  
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
  
  // ─── Resolve or create Inkwell user from Discord identity ─────
  
  async function resolveInkwellUser(discordId, username) {
    const url = `${process.env.INKWELL_API_URL}/auth/discord/bot/upsert`;
    console.log("🔍 Resolving user at:", url); // 👈 add this temporarily
    
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-bot-secret": process.env.BOT_SECRET,
      },
      body: JSON.stringify({ discordId, username }),
    });
  
    console.log("🔍 Upsert response status:", res.status); // 👈 and this
    
    if (res.status === 409) throw new Error("LINK_REQUIRED");
    if (!res.ok) throw new Error("Failed to resolve user");
  
    const { user, isNew } = await res.json();
    return { ...user, isNew };
  }
  
  // ─── Main interaction router ──────────────────────────────────
  
  async function handleSlashCommand(interaction) {
    if (interaction.isChatInputCommand()) {
      if (interaction.commandName === "start") return handleStart(interaction);
      if (interaction.commandName === "join") return handleJoin(interaction);
      if (interaction.commandName === "myid") return handleMyId(interaction);
    }
  
    if (interaction.isStringSelectMenu()) {
      if (interaction.customId === "soundscape_pick") return handleSoundscapePick(interaction);
    }
  }
  
  // ─── /myid ───────────────────────────────────────────────────
  
  async function handleMyId(interaction) {
    await interaction.reply({
      content:
        `Your Discord ID is: \`${interaction.user.id}\`\n\n` +
        `Paste this into your Inkwell settings to link your account:\n` +
        `https://inkwellinky.vercel.app/settings`,
      ephemeral: true,
    });
  }
  
  // ─── /start ──────────────────────────────────────────────────
  
  async function handleStart(interaction) {
    const duration = interaction.options.getInteger("duration");
    await interaction.deferReply();
  
    try {
      const user = await resolveInkwellUser(
        interaction.user.id,
        interaction.user.username
      );
  
      const res = await fetch(`${process.env.INKWELL_API_URL}/group-sprints/bot/startGroupSprint`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-bot-secret": process.env.BOT_SECRET,
        },
        body: JSON.stringify({
          duration,
          userId: user.id,
          username: user.username,
        }),
      });
  
      if (!res.ok) throw new Error(await res.text());
  
      const { groupSprint } = await res.json();
      const link = `https://inkwellinky.vercel.app/group-sprint/${groupSprint.id}`;
  
      const welcome = user.isNew
        ? `\n\n✨ Welcome to Inkwell, **${user.username}**! Your writing journey starts now 🌱`
        : "";
  
      await interaction.editReply(
        `✍️ **${user.username}** just kicked off a **${duration}-min sprint!**\n\n` +
        `Head to Inkwell to join and write together 🌱\n${link}${welcome}`
      );
    } catch (err) {
      if (err.message === "LINK_REQUIRED") {
        return interaction.editReply({ content: LINK_REQUIRED_MSG });
      }
      console.error("handleStart error:", err);
      await interaction.editReply("Couldn't reach Inkwell right now. Please try again.");
    }
  }
  
  // ─── /join — step 1: show soundscape picker (ephemeral) ──────
  
  async function handleJoin(interaction) {
    const startWords = interaction.options.getInteger("words") ?? 0;
    await interaction.deferReply({ ephemeral: true });
  
    try {
      const [soundscapesRes, sprintRes] = await Promise.all([
        fetch(`${process.env.INKWELL_API_URL}/soundscapes`),
        fetch(`${process.env.INKWELL_API_URL}/group-sprints/activeGroupSprints?limit=1`),
      ]);
  
      if (!soundscapesRes.ok) throw new Error("Failed to fetch soundscapes");
  
      const { soundscapes } = await soundscapesRes.json();
      const sprintData = await sprintRes.json().catch(() => null);
      const activeSprint = sprintData?.groupSprints?.[0];
  
      if (!activeSprint) {
        return interaction.editReply({
          content: "There's no active sprint right now. Someone needs to /start one first! 🖊️",
        });
      }
  
      const options = soundscapes.slice(0, 24).map((s) => ({
        label: s.name,
        description: s.creatorName ? `by ${s.creatorName}` : "Inkwell community",
        value: `${s.id}::${activeSprint.id}::${startWords}`,
      }));
  
      options.unshift({
        label: "No soundscape",
        description: "Write in silence",
        value: `none::${activeSprint.id}::${startWords}`,
      });
  
      const row = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId("soundscape_pick")
          .setPlaceholder("Pick your soundscape for the sprint...")
          .addOptions(options)
      );
  
      await interaction.editReply({
        content: "🎵 Pick a soundscape to write to — or skip with 'No soundscape':",
        components: [row],
      });
    } catch (err) {
      console.error("handleJoin error:", err);
      await interaction.editReply({
        content: "Couldn't load soundscapes right now. Head to Inkwell to join directly:\nhttps://inkwellinky.vercel.app",
      });
    }
  }
  
  // ─── /join — step 2: soundscape chosen → join sprint + public message ──
  
  async function handleSoundscapePick(interaction) {
    await interaction.deferUpdate();
  
    const [soundscapeRaw, groupSprintId, startWordsRaw] = interaction.values[0].split("::");
    const soundscapeId = soundscapeRaw === "none" ? null : Number(soundscapeRaw);
    const startWords = Number(startWordsRaw) || 0;
    const link = `https://inkwellinky.vercel.app/group-sprint/${groupSprintId}`;
  
    try {
      const user = await resolveInkwellUser(
        interaction.user.id,
        interaction.user.username
      );
  
      const joinRes = await fetch(`${process.env.INKWELL_API_URL}/group-sprints/bot/join`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-bot-secret": process.env.BOT_SECRET,
        },
        body: JSON.stringify({
          groupSprintId,
          startWords,
          soundscapeId,
          userId: user.id,
          username: user.username,
        }),
      });
  
      // 409 means already in the sprint — soft error, still post the message
      if (!joinRes.ok && joinRes.status !== 409) {
        throw new Error("Join failed");
      }
  
      // Resolve soundscape name for the public message
      let soundscapeName = null;
      if (soundscapeId) {
        try {
          const res = await fetch(`${process.env.INKWELL_API_URL}/soundscapes`);
          const { soundscapes } = await res.json();
          soundscapeName = soundscapes.find((s) => s.id === soundscapeId)?.name ?? null;
        } catch (_) {}
      }
  
      const wordNote = startWords > 0 ? ` (starting at ${startWords} words)` : "";
      const soundNote = soundscapeName ? ` with **${soundscapeName}** playing 🎵` : "";
      const welcomeNote = user.isNew
        ? `\n\n✨ First sprint on Inkwell, **${user.username}**? Welcome! 🌱`
        : "";
  
      // Ephemeral confirm — remove the dropdown
      await interaction.editReply({
        content: `✅ You're in! Head to Inkwell to write:\n${link}${welcomeNote}`,
        components: [],
      });
  
      // Public channel message everyone sees
      await interaction.channel.send(
        `🖊️ **${user.username}** just joined the sprint${wordNote}${soundNote} — sending you positive vibes! 🌱\n\n` +
        `Come write together:\n${link}`
      );
    } catch (err) {
      if (err.message === "LINK_REQUIRED") {
        return interaction.editReply({
          content: LINK_REQUIRED_MSG,
          components: [],
        });
      }
      console.error("handleSoundscapePick error:", err);
      await interaction.editReply({
        content: "Couldn't join the sprint right now. Try heading to Inkwell directly:\nhttps://inkwellinky.vercel.app",
        components: [],
      });
    }
  }
  
  module.exports = { registerCommands, handleSlashCommand };