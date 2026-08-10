const express = require("express");
const router = express.Router();
const { searchSongs } = require("../services/geniusServices");
const { searchYouTube } = require("../services/youtubeServices");

// Helper to clean up YouTube titles into Artist and Title structures
function parseYouTubeTitle(videoTitle, author) {
    let clean = videoTitle
        .replace(/\(Official.*?\)/gi, '')
        .replace(/\[Official.*?\]/gi, '')
        .replace(/\(Lyrics.*?\)/gi, '')
        .replace(/\[Lyrics.*?\]/gi, '')
        .replace(/\(Audio.*?\)/gi, '')
        .replace(/\[Audio.*?\]/gi, '')
        .replace(/\(Video.*?\)/gi, '')
        .replace(/\[Video.*?\]/gi, '')
        .replace(/\(HD\)/gi, '')
        .replace(/\(MV\)/gi, '')
        .replace(/Lyric Video/gi, '')
        .replace(/Official Video/gi, '')
        .replace(/Official Audio/gi, '')
        .trim();

    let parts = clean.split('-');
    let artist = author;
    let title = clean;

    if (parts.length >= 2) {
        artist = parts[0].trim();
        title = parts.slice(1).join('-').trim();
    }

    // Clean up quotes or brackets
    title = title.replace(/^["'\[\(]+|["'\]\)]+$/g, '').trim();
    artist = artist.replace(/^["'\[\(]+|["'\]\)]+$/g, '').trim();

    return {
        title: title || clean,
        artist: artist || author
    };
}

// Search Genius songs by query, with a fallback to YouTube search if no results found
router.get("/search", async (req, res) => {
    try {
        const query = req.query.q;
        if (!query) {
            return res.status(400).json({
                success: false,
                error: "Search query required"
            });
        }

        console.log(`Searching for: ${query}`);
        let songs = await searchSongs(query);

        // Fallback: If Genius search yields nothing, query YouTube
        if (!songs || songs.length === 0) {
            console.log("Genius search returned empty. Falling back to YouTube search...");
            const ytVideos = await searchYouTube(query);

            songs = ytVideos.map(video => {
                const parsed = parseYouTubeTitle(video.title, video.author);
                return {
                    id: `yt_${video.videoId}`,
                    title: parsed.title,
                    artist: parsed.artist,
                    thumbnail: video.thumbnail,
                    image: video.thumbnail,
                    url: null,
                    artistForLyrics: parsed.artist,
                    titleForLyrics: parsed.title,
                    path: null,
                    source: "YouTube",
                    videoId: video.videoId
                };
            });
        } else {
            songs = songs.map(s => ({
                ...s,
                source: "Genius",
                url: s.url || null,
                artistForLyrics: s.artist || null,
                titleForLyrics: s.title || null
            }));
        }

        res.json({
            success: true,
            results: songs
        });
    } catch (error) {
        console.error("Search route error:", error);
        res.status(500).json({
            success: false,
            error: "Search failed"
        });
    }
});

// Resolve a song title & artist to YouTube candidates for streaming
router.get("/youtube", async (req, res) => {
    try {
        const query = req.query.q;
        if (!query) {
            return res.status(400).json({
                success: false,
                error: "Query parameter 'q' is required"
            });
        }

        const videos = await searchYouTube(query);

        if (videos && videos.length > 0) {
            return res.json({
                success: true,
                videos
            });
        }

        return res.status(404).json({
            success: false,
            error: "No video found on YouTube for this track"
        });

    } catch (error) {
        console.error("YouTube route error:", error);
        res.status(500).json({
            success: false,
            error: "YouTube search failed"
        });
    }
});

module.exports = router;