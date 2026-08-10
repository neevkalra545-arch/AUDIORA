/**
 * NOTE: This file is NOT registered in server.js and is NOT active.
 *
 * The real /api/youtube endpoint is defined in routes/search.js
 * and uses yt-search to return real YouTube video candidates.
 *
 * This file was a placeholder with a hardcoded dummy videoId.
 * It has been kept here for reference but should not be imported.
 *
 * If you need to add a separate YouTube route, register it in server.js:
 *   const youtubeRoutes = require('./routes/youtube');
 *   app.use('/api', youtubeRoutes);
 */

const express = require('express');
const router = express.Router();

router.get('/youtube', async (req, res) => {
  try {
    const q = req.query.q;

    if (!q) {
      return res.status(400).json({
        success: false,
        message: 'Query is required'
      });
    }

    // फिलहाल dummy response de rahe hain taaki player break na ho
    // baad me real YouTube search API / ytsr / scraper laga sakte hain
    return res.json({
      success: true,
      video: {
        videoId: 'kJQP7kiw5Fk'
      }
    });

  } catch (error) {
    console.error('YouTube route error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch YouTube video'
    });
  }
});

module.exports = router;