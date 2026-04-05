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
  
  // ─── Shared messages ─────────────────────────────────────────

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
    // Slash commands
    if (interaction.isChatInputCommand()) {
      if (interaction.commandName === "start") return handleStart(interaction);
      if (interaction.commandName === "join") return handleJoin(interaction);
    }
  
    // Select menu — soundscape picker triggered by /join
    if (interaction.isStringSelectMenu()) {
      if (interaction.customId === "soundscape_pick") return handleSoundscapePick(interaction);
    }
  }
  
  // ─── /start ──────────────────────────────────────────────────
  
  async function handleStart(interaction) {
    const duration = interaction.options.getInteger("duration");
  
    await interaction.deferReply();
  
    try {
      const res = await fetch(`${process.env.INKWELL_API_URL}/group-sprints/startGroupSprint`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.INKWELL_BOT_TOKEN}`,
        },
        body: JSON.stringify({ duration }),
      });

      // 401/403 means this Discord user has no linked Inkwell account
      if (res.status === 401 || res.status === 403) {
        return interaction.editReply({ content: SIGNUP_NUDGE, ephemeral: true });
      }

      if (!res.ok) {
        console.error("Inkwell /start error:", await res.text());
        return interaction.editReply(
          "Something went wrong starting the sprint. Try starting it directly on the site."
        );
      }
  
      const { groupSprint } = await res.json();
      const link = `https://inkwellinky.vercel.app/group-sprint/${groupSprint.id}`;
  
      await interaction.editReply(
        `✍️ **${interaction.user.displayName}** just kicked off a **${duration}-min sprint!**\n\n` +
          `Head to Inkwell to join, pick your soundscape, and write together 🌱\n${link}`
      );
    } catch (err) {
      console.error("handleStart error:", err);
      await interaction.editReply(
        "Couldn't reach Inkwell right now. Try starting the sprint directly on the site."
      );
    }
  }
  
  // ─── /join — step 1: show soundscape picker (ephemeral) ──────
  
  async function handleJoin(interaction) {
    const startWords = interaction.options.getInteger("words") ?? 0;
  
    // ephemeral: true — only the person who typed /join sees this picker
    await interaction.deferReply({ ephemeral: true });
  
    try {
      // GET /soundscapes is public — no auth needed per your soundscaperoutes.js
      const [soundscapesRes, sprintRes] = await Promise.all([
        fetch(`${process.env.INKWELL_API_URL}/soundscapes`),
        fetch(`${process.env.INKWELL_API_URL}/group-sprints/activeGroupSprints?limit=1`, {
          headers: { Authorization: `Bearer ${process.env.INKWELL_BOT_TOKEN}` },
        }),
      ]);
  
      if (!soundscapesRes.ok) throw new Error("Failed to fetch soundscapes");
  
      const { soundscapes } = await soundscapesRes.json();
      const sprintData = await sprintRes.json().catch(() => null);

      // 401/403 on the sprint fetch means no linked Inkwell account
      if (sprintRes.status === 401 || sprintRes.status === 403) {
        return interaction.editReply({ content: SIGNUP_NUDGE });
      }

      const activeSprint = sprintData?.groupSprints?.[0];
  
      if (!activeSprint) {
        return interaction.editReply({
          content: "There's no active sprint right now. Someone needs to /start one first! 🖊️",
        });
      }
  
      // Pack groupSprintId + startWords into each option value — we need them in step 2
      // Discord limits select menus to 25 options
      const options = soundscapes.slice(0, 24).map((s) => ({
        label: s.name,
        description: s.creatorName ? `by ${s.creatorName}` : "Inkwell community",
        value: `${s.id}::${activeSprint.id}::${startWords}`,
      }));
  
      // "No soundscape" option at the top
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
        content:
          "Couldn't load soundscapes right now. Head to Inkwell to join directly:\nhttps://inkwellinky.vercel.app",
      });
    }
  }
  
  // ─── /join — step 2: soundscape chosen → public channel message ──
  
  async function handleSoundscapePick(interaction) {
    // Acknowledge the select menu so Discord doesn't show "interaction failed"
    await interaction.deferUpdate();
  
    const [soundscapeRaw, groupSprintId, startWordsRaw] = interaction.values[0].split("::");
    const soundscapeId = soundscapeRaw === "none" ? null : Number(soundscapeRaw);
    const startWords = Number(startWordsRaw) || 0;
    const link = `https://inkwellinky.vercel.app/group-sprint/${groupSprintId}`;
  
    // Resolve the soundscape name for the public message
    let soundscapeName = null;
    if (soundscapeId) {
      try {
        const res = await fetch(`${process.env.INKWELL_API_URL}/soundscapes`);
        const { soundscapes } = await res.json();
        soundscapeName = soundscapes.find((s) => s.id === soundscapeId)?.name ?? null;
      } catch (_) {
        // non-fatal — message still posts fine without the name
      }
    }
  
    const wordNote = startWords > 0 ? ` (starting at ${startWords} words)` : "";
    const soundNote = soundscapeName ? ` with **${soundscapeName}** playing 🎵` : "";
  
    // Update the ephemeral message: confirm and remove the dropdown
    await interaction.editReply({
      content: `✅ You're in! Head to Inkwell to write:\n${link}`,
      components: [],
    });
  
    // Post the public "joined" message everyone in the channel sees
    await interaction.channel.send(
      `🖊️ **${interaction.user.displayName}** just joined the sprint${wordNote}${soundNote} — sending you positive vibes! 🌱\n\n` +
        `Come write together on Inkwell:\n${link}`
    );
  }
  
  module.exports = { registerCommands, handleSlashCommand };