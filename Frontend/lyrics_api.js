// lyrics-api.js - Real lyrics search functionality

class LyricsAPI {
    constructor() {
        // We'll use multiple APIs for better results
        this.apis = {
            lyrics: 'https://api.lyrics.ovh/v1/',
            musixmatch: 'https://api.musixmatch.com/ws/1.1/', // Requires API key
            genius: 'https://api.genius.com/' // Requires API key
        };
    }

    async getLyrics(artist, title) {
        try {
            const res = await fetch(
                `https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`
            );

            const data = await res.json();

            if (data.lyrics) {
                return data.lyrics;
            }

            return "Lyrics not found.";
        } catch (err) {
            console.error(err);
            return "Lyrics unavailable.";
        }
    }

    // Search songs by lyrics using multiple methods
    async searchByLyrics(query) {
        const results = [];
        
        try {
            // Method 1: Search using Deezer API (free, no key needed)
            const deezerResults = await this.searchDeezer(query);
            results.push(...deezerResults);
            
            // Method 2: Search using Last.fm API (free, no key needed)
            const lastfmResults = await this.searchLastFM(query);
            results.push(...lastfmResults);
            
            // Method 3: Enhanced mock results with better matching
            const enhancedMockResults = this.getEnhancedMockResults(query);
            results.push(...enhancedMockResults);
            
        } catch (error) {
            console.error('API search failed:', error);
        }
        
        // Remove duplicates and sort by relevance
        return this.removeDuplicatesAndSort(results, query);
    }

    // Deezer API search
    async searchDeezer(query) {
        try {
            const response = await fetch(`https://api.deezer.com/search?q=${encodeURIComponent(query)}&limit=10`);
            const data = await response.json();
            
            return data.data.map(track => ({
                title: track.title,
                artist: track.artist.name,
                album: track.album.title,
                thumbnail: track.album.cover_medium,
                previewUrl: track.preview,
                duration: track.duration,
                lyrics: await this.getLyrics(track.artist.name, track.title),
                source: 'Deezer',
                id: track.id,
                popularity: track.rank
            }));
        } catch (error) {
            console.error('Deezer search failed:', error);
            return [];
        }
    }

    // Last.fm API search
    async searchLastFM(query) {
        try {
            // Last.fm requires an API key. Do not embed keys in frontend code.
            // If you want Last.fm search, route this request through your backend.
            return [];
            const data = await response.json();
            
            if (data.results && data.results.trackmatches && data.results.trackmatches.track) {
                return data.results.trackmatches.track.map(track => ({
                    title: track.name,
                    artist: track.artist,
                    album: 'Unknown Album',
                    thumbnail: track.image?.[2]?.['#text'] || 'https://via.placeholder.com/100x100/667eea/white?text=♪',
                    previewUrl: null,
                    lyrics: `♪ Lyrics containing: "${query}" ♪`,
                    source: 'Last.fm',
                    id: track.mbid,
                    popularity: parseInt(track.listeners) || 0
                }));
            }
        } catch (error) {
            console.error('Last.fm search failed:', error);
        }
        return [];
    }

    // Enhanced mock results with real song database
    getEnhancedMockResults(query) {
        const songDatabase = [
            {
                title: "Imagine",
                artist: "John Lennon",
                album: "Imagine",
                thumbnail: "https://via.placeholder.com/100x100/667eea/white?text=Imagine",
                previewUrl: null,
                lyrics: "Imagine all the people living life in peace",
                source: "Mock",
                id: "imagine_lennon",
                popularity: 10000
            }
        ];

        return songDatabase.filter(song => 
            song.title.toLowerCase().includes(query.toLowerCase()) ||
            song.artist.toLowerCase().includes(query.toLowerCase())
        );
    }
}
