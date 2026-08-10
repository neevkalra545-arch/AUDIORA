const axios = require("axios");

async function getLyrics(artist, title) {
    try {
        const url = `https://lrclib.net/api/get?artist_name=${encodeURIComponent(artist)}&track_name=${encodeURIComponent(title)}`;

        const { data } = await axios.get(url, {
            headers: {
                "User-Agent": "MusicPlayer/1.0"
            }
        });

        return {
            success: true,
            lyrics: data.plainLyrics || data.syncedLyrics || "Lyrics not available."
        };

    } catch (err) {
        return {
            success: false,
            lyrics: "Lyrics not found."
        };
    }
}

module.exports = { getLyrics };