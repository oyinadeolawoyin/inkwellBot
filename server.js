const express = require("express");
const { notifyGroupSprintStarted, notifyGroupSprintEnded } = require("./notifyService");

const app = express();
app.use(express.json());

function requireSecret(req, res, next) {
  const secret = req.headers["x-bot-secret"];
  if (secret !== process.env.BOT_SECRET) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

app.post("/notify/sprint-started", requireSecret, async (req, res) => {
  const { username, duration, soundscape, groupSprintId } = req.body;
  try {
    await notifyGroupSprintStarted({ username, duration, soundscape, groupSprintId });
    res.json({ ok: true });
  } catch (err) {
    console.error("notify sprint-started error:", err);
    res.status(500).json({ error: "Failed to send" });
  }
});

app.post("/notify/sprint-ended", requireSecret, async (req, res) => {
  const { username, groupSprintId, totalWordsWritten } = req.body;
  try {
    await notifyGroupSprintEnded({ username, groupSprintId, totalWordsWritten });
    res.json({ ok: true });
  } catch (err) {
    console.error("notify sprint-ended error:", err);
    res.status(500).json({ error: "Failed to send" });
  }
});

app.post("/notify/member-checked-out", requireSecret, async (req, res) => {
  const { username, wordsWritten, groupSprintId } = req.body;
  try {
    await notifyMemberCheckedOut({ username, wordsWritten, groupSprintId });
    res.json({ ok: true });
  } catch (err) {
    console.error("notify member-checked-out error:", err);
    res.status(500).json({ error: "Failed to send" });
  }
});

function startServer() {
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => console.log(`🌐 Bot HTTP server listening on port ${PORT}`));
}

module.exports = { startServer };