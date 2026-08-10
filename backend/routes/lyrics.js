const express = require("express");
const router = express.Router();
const { getLyrics } = require("../services/lrclibService");

router.get("/lyrics", async (req, res) => {
    try {
        const { artist, title } = req.query;

        if (!artist || !title) {
            return res.status(400).json({
                success: false,
                error: "Artist and title are required"
            });
        }

        const result = await getLyrics(artist, title);

        if (result.success) {
            return res.json({
                success: true,
                lyrics: result.lyrics
            });
        }

        return res.status(404).json({
            success: false,
            error: result.error || "Lyrics not found"
        });

    } catch (err) {
        console.error("Lyrics Error:", err);

        res.status(500).json({
            success: false,
            error: "Internal Server Error"
        });
    }
});

module.exports = router;