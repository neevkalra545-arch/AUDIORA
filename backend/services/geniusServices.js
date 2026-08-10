const axios = require("axios");
const cheerio = require("cheerio");

/**
 * Searches Genius using their public web search API (no auth token needed).
 * @param {string} query Search query (e.g. lyrics, title, artist)
 * @returns {Promise<Array>} List of song objects
 */
async function searchSongs(query) {
    try {
        const url = `https://genius.com/api/search/multi?q=${encodeURIComponent(query)}`;
        const response = await axios.get(url, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            }
        });

        const sections = response.data?.response?.sections || [];
        const songSection = sections.find(section => section.type === "song");
        
        if (!songSection || !songSection.hits) {
            return [];
        }

        return songSection.hits.map(hit => ({
            id: hit.result.id,
            title: hit.result.title,
            artist: hit.result.primary_artist.name,
            thumbnail: hit.result.song_art_image_thumbnail_url,
            image: hit.result.song_art_image_url,
            url: hit.result.url,
            path: hit.result.path
        }));
    } catch (error) {
        console.error("Genius public search error:", error);
        return [];
    }
}

/**
 * Scrapes lyrics from a Genius song URL.
 * Parses the HTML response and extracts lyrics text.
 * @param {string} geniusUrl Full URL to the Genius song page
 * @returns {Promise<string>} Lyrics text
 */
async function scrapeLyrics(geniusUrl) {
    try {
        const response = await axios.get(geniusUrl, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            }
        });

        const html = response.data;
        const $ = cheerio.load(html);

        let lyricsText = "";

        // Modern Genius layout
        const containers = $('div[class^="Lyrics__Container"]');
        if (containers.length > 0) {
            containers.each((_, el) => {
                // Replace <br> tags with newlines
                $(el).find('br').replaceWith('\n');
                // Format block elements (like divs, links) to maintain basic text structure
                lyricsText += $(el).text() + "\n\n";
            });
        } else {
            // Older Genius layout fallback
            const oldContainer = $('.lyrics');
            if (oldContainer.length > 0) {
                oldContainer.find('br').replaceWith('\n');
                lyricsText = oldContainer.text();
            }
        }

        // Clean up the lyrics string
        lyricsText = lyricsText
            .replace(/\n{3,}/g, "\n\n") // Remove excessive spacing
            .trim();

        return lyricsText || "Lyrics are instrumental or could not be found.";
    } catch (error) {
        console.error("Scraping lyrics error:", error);
        return "Error fetching lyrics from Genius.";
    }
}

module.exports = {
    searchSongs,
    scrapeLyrics
};