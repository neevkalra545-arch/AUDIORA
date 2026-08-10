const express = require("express");
const router = express.Router();
const localSearchHistoryDb = require("../services/localSearchHistoryDb");
const auth = require("../middleware/auth");

// ── GET: Fetch user search history ─────────────────────────────────────────
router.get("/search-history", auth, (req, res) => {
  try {
    const { limit = 50, searchType } = req.query;

    const history = localSearchHistoryDb.findByUser(req.user.id, searchType)
      .slice(0, parseInt(limit));

    res.json({
      success: true,
      count: history.length,
      history
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ── POST: Add to search history ────────────────────────────────────────────
router.post("/search-history", auth, (req, res) => {
  try {
    const { query, searchType = "song", results = [] } = req.body;

    if (!query || query.trim() === "") {
      return res.status(400).json({
        success: false,
        error: "Search query is required"
      });
    }

    const search = localSearchHistoryDb.addSearch(
      req.user.id,
      query.trim(),
      searchType,
      results
    );

    res.status(201).json({
      success: true,
      message: "Search added to history",
      search
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ── GET: Get unique search queries ────────────────────────────────────────
router.get("/search-history/unique", auth, (req, res) => {
  try {
    const { limit = 10, searchType } = req.query;

    const uniqueSearches = localSearchHistoryDb.getUnique(req.user.id, searchType, parseInt(limit));

    res.json({
      success: true,
      count: uniqueSearches.length,
      searches: uniqueSearches
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ── DELETE: Remove single search from history ──────────────────────────────
router.delete("/search-history/:searchId", auth, (req, res) => {
  try {
    const { searchId } = req.params;

    const result = localSearchHistoryDb.removeOne(req.user.id, searchId);

    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        error: "Search record not found"
      });
    }

    res.json({
      success: true,
      message: "Search removed from history"
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ── DELETE: Clear all search history ───────────────────────────────────────
router.delete("/search-history/clear/all", auth, (req, res) => {
  try {
    const result = localSearchHistoryDb.removeAll(req.user.id);

    res.json({
      success: true,
      message: `${result.deletedCount} search records deleted`,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ── GET: Get search history statistics ─────────────────────────────────────
router.get("/search-history/stats", auth, (req, res) => {
  try {
    const stats = localSearchHistoryDb.getStats(req.user.id);
    const totalSearches = localSearchHistoryDb.count(req.user.id);

    res.json({
      success: true,
      totalSearches,
      byType: stats
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ── GET: Search autocomplete suggestions ───────────────────────────────────
router.get("/search-history/suggestions/:prefix", auth, (req, res) => {
  try {
    const { prefix } = req.params;
    const { limit = 5 } = req.query;

    if (!prefix || prefix.trim().length < 1) {
      return res.json({
        success: true,
        suggestions: []
      });
    }

    const suggestions = localSearchHistoryDb.getSuggestions(req.user.id, prefix, parseInt(limit));

    res.json({
      success: true,
      suggestions
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
