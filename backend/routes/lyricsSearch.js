const express = require('express');
const router = express.Router();
const axios = require('axios');
const { intelligentLyricsSearch } = require("../services/smartSearchService");

// ── Fallback 1: LRCLIB search (free, no API key needed) ──────────────────────
async function searchLRCLIB(query) {
  try {
    const { data } = await axios.get(
      `https://lrclib.net/api/search?q=${encodeURIComponent(query)}`,
      { headers: { 'User-Agent': 'MusicPlayer/1.0' }, timeout: 8000 }
    );
    if (!Array.isArray(data) || data.length === 0) return [];
    return data.map(item => ({
      id: `lrclib_${item.id}`,
      title: item.trackName || item.name || '',
      artist: item.artistName || '',
      album: item.albumName || '',
      thumbnail: null,
      image: null,
      url: null,
      path: null,
      source: 'LRCLIB'
    }));
  } catch (err) {
    console.error('LRCLIB search failed:', err.message);
    return [];
  }
}

// ── Fallback 2: Lyrics.ovh / Deezer suggest (free, no API key needed) ────────
async function searchLyricsOvh(query) {
  try {
    const { data } = await axios.get(
      `https://api.lyrics.ovh/suggest/${encodeURIComponent(query)}`,
      { timeout: 8000 }
    );
    if (!data || !Array.isArray(data.data) || data.data.length === 0) return [];
    return data.data.map(item => ({
      id: `deezer_${item.id}`,
      title: item.title || '',
      artist: (item.artist && item.artist.name) || '',
      album: (item.album && item.album.title) || '',
      thumbnail: (item.album && item.album.cover_medium) || null,
      image: (item.album && item.album.cover_big) || null,
      url: null,
      path: null,
      source: 'Deezer'
    }));
  } catch (err) {
    console.error('Lyrics.ovh suggest failed:', err.message);
    return [];
  }
}

// Lyrics-text search endpoint.
// Fallback order: LRCLIB → Lyrics.ovh → Genius
// NOTE: This is heuristic. Exact lyrics snippet matching isn't guaranteed.
router.get('/search', async (req, res) => {
  try {
    const query = (req.query.q || '').trim();
    if (!query) {
      return res.status(400).json({
        success: false,
        error: "Query parameter 'q' is required"
      });
    }

    // Try each provider in order until one returns results
    let songs = await searchLRCLIB(query);
    if (!songs.length) songs = await searchLyricsOvh(query);
    if (!songs.length) songs = await intelligentLyricsSearch(query);

    // Normalize shape so frontend can treat it like /api/search results.
    const results = (songs || []).map(s => ({
      id: s.id,
      title: s.title,
      artist: s.artist,
      album: s.album,
      thumbnail: s.thumbnail,
      image: s.image,

      // Important: frontend expects either a Genius `url` OR enough info
      // to resolve lyrics via /api/lyrics?artist=...&title=...
      url: s.url || null,
      artistForLyrics: s.artist || null,
      titleForLyrics: s.title || null,

      path: s.path || null,
      source: s.source || 'Genius'
    }));

    res.json({
      success: true,
      results
    });

  } catch (error) {
    console.error('Lyrics text search error:', error);
    res.status(500).json({
      success: false,
      error: 'Lyrics text search failed'
    });
  }
});

module.exports = router;

