const express = require("express");
const router = express.Router();
const localLikedSongsDb = require("../services/localLikedSongsDb");
const auth = require("../middleware/auth");

// ── GET: Fetch all liked songs for user ────────────────────────────────────
router.get("/liked-songs", auth, (req, res) => {
  try {
    const { sort = "-likedAt", limit = 1000 } = req.query;

    let likedSongs = localLikedSongsDb.findByUser(req.user.id);
    
    // Sort
    if (sort === "-likedAt") {
      likedSongs.sort((a, b) => new Date(b.likedAt) - new Date(a.likedAt));
    } else if (sort === "likedAt") {
      likedSongs.sort((a, b) => new Date(a.likedAt) - new Date(b.likedAt));
    }

    // Limit
    if (limit) {
      likedSongs = likedSongs.slice(0, parseInt(limit));
    }

    res.json({
      success: true,
      count: likedSongs.length,
      likedSongs
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ── POST: Add song to liked songs ──────────────────────────────────────────
router.post("/liked-songs", auth, (req, res) => {
  try {
    const { title, artist, album, duration, youtubeId, thumbnailUrl } = req.body;

    // Validation
    if (!title || !artist || !youtubeId) {
      return res.status(400).json({
        success: false,
        error: "Title, artist, and youtubeId are required"
      });
    }

    try {
      const likedSong = localLikedSongsDb.addOne({
        userId: req.user.id,
        title: title.trim(),
        artist: artist.trim(),
        album: album?.trim() || "Unknown",
        duration: duration || 0,
        youtubeId,
        thumbnailUrl: thumbnailUrl || null
      });

      res.status(201).json({
        success: true,
        message: "Song added to liked songs",
        likedSong
      });
    } catch (err) {
      if (err.code === 11000) {
        return res.status(400).json({
          success: false,
          error: "Song already in liked songs"
        });
      }
      throw err;
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ── DELETE: Remove song from liked songs ───────────────────────────────────
router.delete("/liked-songs/:youtubeId", auth, (req, res) => {
  try {
    const { youtubeId } = req.params;

    const result = localLikedSongsDb.removeOne(req.user.id, youtubeId);

    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        error: "Song not found in liked songs"
      });
    }

    res.json({
      success: true,
      message: "Song removed from liked songs"
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ── GET: Check if specific song is liked ───────────────────────────────────
router.get("/liked-songs/check/:youtubeId", auth, (req, res) => {
  try {
    const { youtubeId } = req.params;

    const likedSong = localLikedSongsDb.findOne(req.user.id, youtubeId);

    res.json({
      success: true,
      isLiked: !!likedSong,
      likedSong: likedSong || null
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ── POST: Bulk add multiple songs to liked songs ────────────────────────────
router.post("/liked-songs/bulk", auth, (req, res) => {
  try {
    const { songs } = req.body;

    if (!Array.isArray(songs) || songs.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Songs array is required"
      });
    }

    const newSongs = songs.map(song => ({
      ...song,
      userId: req.user.id,
      album: song.album?.trim() || "Unknown"
    }));

    const inserted = localLikedSongsDb.addMany(newSongs);

    if (inserted.length === 0) {
      return res.json({
        success: true,
        message: "All songs already liked",
        added: 0
      });
    }

    res.status(201).json({
      success: true,
      message: `${inserted.length} songs added to liked songs`,
      added: inserted.length,
      likedSongs: inserted
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ── DELETE: Clear all liked songs ──────────────────────────────────────────
router.delete("/liked-songs/clear/all", auth, (req, res) => {
  try {
    const result = localLikedSongsDb.removeAll(req.user.id);

    res.json({
      success: true,
      message: `${result.deletedCount} songs removed from liked songs`,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ── GET: Get liked songs count ─────────────────────────────────────────────
router.get("/liked-songs/count", auth, (req, res) => {
  try {
    const count = localLikedSongsDb.findByUser(req.user.id).length;

    res.json({
      success: true,
      count
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
