const express = require("express");
const router = express.Router();
const localPlaylistsDb = require("../services/localPlaylistsDb");
const auth = require("../middleware/auth");

// ── GET: Fetch all playlists for user ────────────────────────────────────────
router.get("/playlists", auth, (req, res) => {
  try {
    const playlists = localPlaylistsDb.findByUser(req.user.id);
    res.json({
      success: true,
      count: playlists.length,
      playlists
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ── GET: Fetch single playlist by ID ──────────────────────────────────────────
router.get("/playlists/:id", auth, (req, res) => {
  try {
    const playlist = localPlaylistsDb.findOne(req.user.id, req.params.id);
    if (!playlist) {
      return res.status(404).json({ success: false, error: "Playlist not found" });
    }
    res.json({
      success: true,
      playlist
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ── POST: Create new playlist ───────────────────────────────────────────────
router.post("/playlists", auth, (req, res) => {
  try {
    const { name, description, isPublic, playlistArtwork } = req.body;

    if (!name || name.trim() === "") {
      return res.status(400).json({ success: false, error: "Playlist name is required" });
    }

    const playlist = localPlaylistsDb.create({
      userId: req.user.id,
      name: name.trim(),
      description: description?.trim() || "",
      isPublic: !!isPublic,
      playlistArtwork: playlistArtwork || null,
      songs: []
    });

    res.status(201).json({
      success: true,
      playlist
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ── PUT: Update playlist details ─────────────────────────────────────────────
router.put("/playlists/:id", auth, (req, res) => {
  try {
    const playlist = localPlaylistsDb.findOne(req.user.id, req.params.id);
    if (!playlist) {
      return res.status(404).json({ success: false, error: "Playlist not found" });
    }

    const { name, description, isPublic, playlistArtwork } = req.body;
    const updates = {};
    if (name !== undefined) updates.name = name.trim();
    if (description !== undefined) updates.description = description.trim();
    if (isPublic !== undefined) updates.isPublic = !!isPublic;
    if (playlistArtwork !== undefined) updates.playlistArtwork = playlistArtwork;

    const updated = localPlaylistsDb.update(req.params.id, updates);

    res.json({
      success: true,
      playlist: updated
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ── DELETE: Delete playlist ──────────────────────────────────────────────────
router.delete("/playlists/:id", auth, (req, res) => {
  try {
    const result = localPlaylistsDb.removeOne(req.user.id, req.params.id);
    if (result.deletedCount === 0) {
      return res.status(404).json({ success: false, error: "Playlist not found" });
    }
    res.json({
      success: true,
      message: "Playlist deleted successfully"
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ── POST: Add song to playlist ───────────────────────────────────────────────
router.post("/playlists/:id/songs", auth, (req, res) => {
  try {
    const playlist = localPlaylistsDb.findOne(req.user.id, req.params.id);
    if (!playlist) {
      return res.status(404).json({ success: false, error: "Playlist not found" });
    }

    const { title, artist, album, duration, youtubeId, thumbnailUrl } = req.body;
    if (!title || !artist || !youtubeId) {
      return res.status(400).json({ success: false, error: "Title, artist, and youtubeId are required" });
    }

    // Check if song already exists in playlist
    if (playlist.songs.some(s => s.youtubeId === youtubeId)) {
      return res.status(400).json({ success: false, error: "Song already in playlist" });
    }

    const newSong = {
      title: title.trim(),
      artist: artist.trim(),
      album: album?.trim() || "Unknown",
      duration: duration || 0,
      youtubeId,
      thumbnailUrl: thumbnailUrl || null,
      addedAt: new Date().toISOString()
    };

    const songs = [...playlist.songs, newSong];
    const totalDuration = songs.reduce((sum, song) => sum + (song.duration || 0), 0);

    const updated = localPlaylistsDb.update(req.params.id, {
      songs,
      totalDuration
    });

    res.status(200).json({
      success: true,
      playlist: updated
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ── DELETE: Remove song from playlist ──────────────────────────────────────────
router.delete("/playlists/:id/songs/:youtubeId", auth, (req, res) => {
  try {
    const playlist = localPlaylistsDb.findOne(req.user.id, req.params.id);
    if (!playlist) {
      return res.status(404).json({ success: false, error: "Playlist not found" });
    }

    const { youtubeId } = req.params;
    const initialCount = playlist.songs.length;
    const songs = playlist.songs.filter(s => s.youtubeId !== youtubeId);

    if (songs.length === initialCount) {
      return res.status(404).json({ success: false, error: "Song not found in playlist" });
    }

    const totalDuration = songs.reduce((sum, song) => sum + (song.duration || 0), 0);

    const updated = localPlaylistsDb.update(req.params.id, {
      songs,
      totalDuration
    });

    res.json({
      success: true,
      playlist: updated
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
