const ytSearch = require("yt-search");

/**
 * Searches YouTube for playable candidates
 * @param {string} query
 * @returns {Promise<Array>}
 */
async function searchYouTube(query) {
    try {
        const result = await ytSearch(query);
        let videos = result.videos || [];

        if (!videos.length) return [];

        // Basic ranking / cleanup
        videos = videos
            .filter(v => v.videoId && v.title)
            .filter(v => {
                const title = v.title.toLowerCase();

                // throw away obvious junk
                if (title.includes("live")) return false;
                if (title.includes("reaction")) return false;
                if (title.includes("interview")) return false;
                if (title.includes("full album")) return false;
                if (title.includes("podcast")) return false;

                return true;
            })
            .slice(0, 8)
            .map(video => ({
                videoId: video.videoId,
                title: video.title,
                url: video.url,
                duration: video.timestamp,
                thumbnail: video.thumbnail || video.image,
                author: video.author?.name || "Unknown"
            }));

        return videos;
    } catch (error) {
        console.error("YouTube search error:", error);
        return [];
    }
}

module.exports = {
    searchYouTube
};