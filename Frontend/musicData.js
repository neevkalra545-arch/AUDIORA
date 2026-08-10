/**
 * Audiora — Centralized Music Database
 * Single source of truth for all songs, playlists, and genres.
 * Songs use youtubeQuery so the backend yt-search returns real playable videos.
 */

window.MUSIC_DB = {

    // ─────────────────────────────────────────────────────────────────────────
    // SONGS (25+ tracks across Pop, Rock, Hip-Hop, Indie, EDM, Jazz, Lo-fi)
    // ─────────────────────────────────────────────────────────────────────────
    songs: [
        // ── POP ──────────────────────────────────────────────────────────────
        {
            id: 'db_blinding_lights',
            title: 'Blinding Lights',
            artist: 'The Weeknd',
            album: 'After Hours',
            thumbnail: 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=300&q=80',
            duration: '3:20',
            genre: 'Pop',
            youtubeQuery: 'The Weeknd Blinding Lights official audio'
        },
        {
            id: 'db_flowers',
            title: 'Flowers',
            artist: 'Miley Cyrus',
            album: 'Endless Summer Vacation',
            thumbnail: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&q=80',
            duration: '3:21',
            genre: 'Pop',
            youtubeQuery: 'Miley Cyrus Flowers official audio'
        },
        {
            id: 'db_as_it_was',
            title: 'As It Was',
            artist: 'Harry Styles',
            album: "Harry's House",
            thumbnail: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300&q=80',
            duration: '2:37',
            genre: 'Pop',
            youtubeQuery: 'Harry Styles As It Was official audio'
        },
        {
            id: 'db_levitating',
            title: 'Levitating',
            artist: 'Dua Lipa',
            album: 'Future Nostalgia',
            thumbnail: 'https://images.unsplash.com/photo-1512641407322-1ce4b5c4e39e?w=300&q=80',
            duration: '3:23',
            genre: 'Pop',
            youtubeQuery: 'Dua Lipa Levitating official audio'
        },
        {
            id: 'db_bad_guy',
            title: 'bad guy',
            artist: 'Billie Eilish',
            album: 'When We All Fall Asleep, Where Do We Go?',
            thumbnail: 'https://images.unsplash.com/photo-1520975958221-29a0f0bce0f5?w=300&q=80',
            duration: '3:14',
            genre: 'Pop',
            youtubeQuery: 'Billie Eilish bad guy official audio'
        },
        {
            id: 'db_stay',
            title: 'STAY',
            artist: 'The Kid LAROI & Justin Bieber',
            album: 'F*CK LOVE 3: OVER YOU',
            thumbnail: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=300&q=80',
            duration: '2:21',
            genre: 'Pop',
            youtubeQuery: 'The Kid LAROI Justin Bieber STAY official audio'
        },
        {
            id: 'db_peaches',
            title: 'Peaches',
            artist: 'Justin Bieber ft. Daniel Caesar & Giveon',
            album: 'Justice',
            thumbnail: 'https://images.unsplash.com/photo-1518091043644-c1d4457512c6?w=300&q=80',
            duration: '3:18',
            genre: 'Pop',
            youtubeQuery: 'Justin Bieber Peaches official audio'
        },

        // ── ROCK ─────────────────────────────────────────────────────────────
        {
            id: 'db_bohemian',
            title: 'Bohemian Rhapsody',
            artist: 'Queen',
            album: 'A Night at the Opera',
            thumbnail: 'https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?w=300&q=80',
            duration: '5:55',
            genre: 'Rock',
            youtubeQuery: 'Queen Bohemian Rhapsody official audio'
        },
        {
            id: 'db_teen_spirit',
            title: 'Smells Like Teen Spirit',
            artist: 'Nirvana',
            album: 'Nevermind',
            thumbnail: 'https://images.unsplash.com/photo-1524368535928-5b5e00ddc76b?w=300&q=80',
            duration: '5:01',
            genre: 'Rock',
            youtubeQuery: 'Nirvana Smells Like Teen Spirit official audio'
        },
        {
            id: 'db_hotel_california',
            title: 'Hotel California',
            artist: 'Eagles',
            album: 'Hotel California',
            thumbnail: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&q=80',
            duration: '6:30',
            genre: 'Rock',
            youtubeQuery: 'Eagles Hotel California official audio'
        },
        {
            id: 'db_thunderstruck',
            title: 'Thunderstruck',
            artist: 'AC/DC',
            album: 'The Razors Edge',
            thumbnail: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=300&q=80',
            duration: '4:52',
            genre: 'Rock',
            youtubeQuery: 'ACDC Thunderstruck official audio'
        },
        {
            id: 'db_eye_tiger',
            title: 'Eye of the Tiger',
            artist: 'Survivor',
            album: 'Eye of the Tiger',
            thumbnail: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=300&q=80',
            duration: '4:05',
            genre: 'Rock',
            youtubeQuery: 'Survivor Eye of the Tiger official audio'
        },

        // ── HIP-HOP ──────────────────────────────────────────────────────────
        {
            id: 'db_gods_plan',
            title: "God's Plan",
            artist: 'Drake',
            album: 'Scorpion',
            thumbnail: 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=300&q=80',
            duration: '3:19',
            genre: 'Hip-Hop',
            youtubeQuery: 'Drake Gods Plan official audio'
        },
        {
            id: 'db_humble',
            title: 'HUMBLE.',
            artist: 'Kendrick Lamar',
            album: 'DAMN.',
            thumbnail: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=300&q=80',
            duration: '2:57',
            genre: 'Hip-Hop',
            youtubeQuery: 'Kendrick Lamar HUMBLE official audio'
        },
        {
            id: 'db_rockstar',
            title: 'Rockstar',
            artist: 'Post Malone ft. 21 Savage',
            album: 'beerbongs & bentleys',
            thumbnail: 'https://images.unsplash.com/photo-1520975916090-3105956dac38?w=300&q=80',
            duration: '3:41',
            genre: 'Hip-Hop',
            youtubeQuery: 'Post Malone Rockstar official audio'
        },
        {
            id: 'db_sunflower',
            title: 'Sunflower',
            artist: 'Post Malone & Swae Lee',
            album: 'Spider-Man: Into the Spider-Verse',
            thumbnail: 'https://images.unsplash.com/photo-1487180142328-0c4e37023af5?w=300&q=80',
            duration: '2:38',
            genre: 'Hip-Hop',
            youtubeQuery: 'Post Malone Swae Lee Sunflower official audio'
        },

        // ── INDIE ────────────────────────────────────────────────────────────
        {
            id: 'db_someone_you_loved',
            title: 'Someone You Loved',
            artist: 'Lewis Capaldi',
            album: 'Divinely Uninspired to a Hellish Extent',
            thumbnail: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=300&q=80',
            duration: '3:02',
            genre: 'Indie',
            youtubeQuery: 'Lewis Capaldi Someone You Loved official audio'
        },
        {
            id: 'db_sweater_weather',
            title: 'Sweater Weather',
            artist: 'The Neighbourhood',
            album: 'I Love You.',
            thumbnail: 'https://images.unsplash.com/photo-1519682337058-a94d519337bc?w=300&q=80',
            duration: '4:00',
            genre: 'Indie',
            youtubeQuery: 'The Neighbourhood Sweater Weather official audio'
        },
        {
            id: 'db_mr_brightside',
            title: 'Mr. Brightside',
            artist: 'The Killers',
            album: 'Hot Fuss',
            thumbnail: 'https://images.unsplash.com/photo-1507874457470-272b3c8d8ee2?w=300&q=80',
            duration: '3:42',
            genre: 'Indie',
            youtubeQuery: 'The Killers Mr Brightside official audio'
        },
        {
            id: 'db_take_me_church',
            title: 'Take Me to Church',
            artist: 'Hozier',
            album: 'Hozier',
            thumbnail: 'https://images.unsplash.com/photo-1523292562811-8fa7962a78c8?w=300&q=80',
            duration: '4:01',
            genre: 'Indie',
            youtubeQuery: 'Hozier Take Me to Church official audio'
        },

        // ── EDM ──────────────────────────────────────────────────────────────
        {
            id: 'db_titanium',
            title: 'Titanium',
            artist: 'David Guetta ft. Sia',
            album: 'Nothing but the Beat',
            thumbnail: 'https://images.unsplash.com/photo-1520975661595-6453be3f7070?w=300&q=80',
            duration: '4:05',
            genre: 'EDM',
            youtubeQuery: 'David Guetta Sia Titanium official audio'
        },
        {
            id: 'db_wake_me_up',
            title: 'Wake Me Up',
            artist: 'Avicii',
            album: 'True',
            thumbnail: 'https://images.unsplash.com/photo-1524368535928-5b5e00ddc76b?w=300&q=80',
            duration: '4:07',
            genre: 'EDM',
            youtubeQuery: 'Avicii Wake Me Up official audio'
        },
        {
            id: 'db_animals',
            title: 'Animals',
            artist: 'Martin Garrix',
            album: 'Gold Skies',
            thumbnail: 'https://images.unsplash.com/photo-1518091043644-c1d4457512c6?w=300&q=80',
            duration: '5:49',
            genre: 'EDM',
            youtubeQuery: 'Martin Garrix Animals official audio'
        },

        // ── JAZZ ─────────────────────────────────────────────────────────────
        {
            id: 'db_fly_me_to_moon',
            title: 'Fly Me to the Moon',
            artist: 'Frank Sinatra',
            album: 'It Might as Well Be Swing',
            thumbnail: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&q=80',
            duration: '2:29',
            genre: 'Jazz',
            youtubeQuery: 'Frank Sinatra Fly Me to the Moon official'
        },
        {
            id: 'db_feeling_good',
            title: 'Feeling Good',
            artist: 'Nina Simone',
            album: 'I Put a Spell on You',
            thumbnail: 'https://images.unsplash.com/photo-1507874457470-272b3c8d8ee2?w=300&q=80',
            duration: '2:58',
            genre: 'Jazz',
            youtubeQuery: 'Nina Simone Feeling Good official'
        },
        {
            id: 'db_what_a_wonderful',
            title: "What a Wonderful World",
            artist: 'Louis Armstrong',
            album: 'What a Wonderful World',
            thumbnail: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&q=80',
            duration: '2:19',
            genre: 'Jazz',
            youtubeQuery: 'Louis Armstrong What a Wonderful World official'
        },

        // ── LO-FI ────────────────────────────────────────────────────────────
        {
            id: 'db_lofi_1',
            title: 'Snowfall',
            artist: 'Øneheart & reidenshi',
            album: 'Lo-fi Chill',
            thumbnail: 'https://images.unsplash.com/photo-1519683109079-d5f539e1542f?w=300&q=80',
            duration: '2:33',
            genre: 'Lo-fi',
            youtubeQuery: 'Snowfall lofi hip hop chill study'
        },
        {
            id: 'db_lofi_2',
            title: 'Carefree',
            artist: 'Kevin MacLeod',
            album: 'Lo-fi Essentials',
            thumbnail: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=300&q=80',
            duration: '2:50',
            genre: 'Lo-fi',
            youtubeQuery: 'lofi hip hop beats to study and relax to chill'
        },
        {
            id: 'db_lofi_3',
            title: 'Rainy Day',
            artist: 'ChilledCow',
            album: 'Lo-fi Study Beats',
            thumbnail: 'https://images.unsplash.com/photo-1501084817091-a4f3d1d19e07?w=300&q=80',
            duration: '3:12',
            genre: 'Lo-fi',
            youtubeQuery: 'lofi hip hop radio beats to relax study'
        }
    ],

    // ─────────────────────────────────────────────────────────────────────────
    // PLAYLISTS (10 curated playlists with 10-20 songs each)
    // ─────────────────────────────────────────────────────────────────────────
    playlists: [
        {
            id: 'hits',
            name: 'Global Top Hits',
            desc: 'The biggest tracks dominating charts worldwide right now.',
            icon: 'fa-chart-line',
            gradient: 'promo-gradient-1',
            songIds: [
                'db_blinding_lights', 'db_flowers', 'db_as_it_was', 'db_levitating',
                'db_bad_guy', 'db_stay', 'db_gods_plan', 'db_humble',
                'db_rockstar', 'db_sunflower', 'db_peaches'
            ]
        },
        {
            id: 'chill',
            name: 'Chill Vibes',
            desc: 'Relax and unwind with these mellow, soothing tracks.',
            icon: 'fa-mug-hot',
            gradient: 'promo-gradient-2',
            songIds: [
                'db_lofi_1', 'db_lofi_2', 'db_lofi_3', 'db_someone_you_loved',
                'db_sweater_weather', 'db_fly_me_to_moon', 'db_feeling_good',
                'db_what_a_wonderful', 'db_flowers', 'db_as_it_was'
            ]
        },
        {
            id: 'rock',
            name: 'Rock Classics',
            desc: 'Heavy riffs and legendary anthems that stood the test of time.',
            icon: 'fa-guitar',
            gradient: 'promo-gradient-3',
            songIds: [
                'db_bohemian', 'db_teen_spirit', 'db_hotel_california',
                'db_thunderstruck', 'db_eye_tiger', 'db_mr_brightside',
                'db_take_me_church', 'db_sweater_weather'
            ]
        },
        {
            id: 'workout',
            name: 'Workout Mix',
            desc: 'High-energy bangers to fuel your gym session.',
            icon: 'fa-bolt',
            gradient: 'promo-gradient-4',
            songIds: [
                'db_eye_tiger', 'db_thunderstruck', 'db_titanium', 'db_animals',
                'db_wake_me_up', 'db_humble', 'db_rockstar', 'db_teen_spirit',
                'db_blinding_lights', 'db_stay', 'db_gods_plan'
            ]
        },
        {
            id: 'lofi',
            name: 'Lo-fi Study',
            desc: 'Beats to focus, study, and breathe easy.',
            icon: 'fa-headphones',
            gradient: 'promo-gradient-5',
            songIds: [
                'db_lofi_1', 'db_lofi_2', 'db_lofi_3', 'db_fly_me_to_moon',
                'db_feeling_good', 'db_what_a_wonderful', 'db_someone_you_loved',
                'db_sweater_weather', 'db_take_me_church'
            ]
        },
        {
            id: 'party',
            name: 'Party Hits',
            desc: 'Turn it up! The ultimate playlist for every party.',
            icon: 'fa-star',
            gradient: 'promo-gradient-1',
            songIds: [
                'db_levitating', 'db_bad_guy', 'db_stay', 'db_blinding_lights',
                'db_flowers', 'db_titanium', 'db_animals', 'db_wake_me_up',
                'db_rockstar', 'db_gods_plan', 'db_thunderstruck', 'db_peaches'
            ]
        },
        {
            id: 'indie',
            name: 'Indie Essentials',
            desc: 'Fresh sounds and authentic vibes from indie artists.',
            icon: 'fa-record-vinyl',
            gradient: 'promo-gradient-2',
            songIds: [
                'db_sweater_weather', 'db_mr_brightside', 'db_take_me_church',
                'db_someone_you_loved', 'db_bad_guy', 'db_as_it_was',
                'db_flowers', 'db_levitating'
            ]
        },
        {
            id: 'hiphop',
            name: 'Hip-Hop Mix',
            desc: 'The hardest bars, slickest flows, and biggest beats.',
            icon: 'fa-microphone',
            gradient: 'promo-gradient-3',
            songIds: [
                'db_gods_plan', 'db_humble', 'db_rockstar', 'db_sunflower',
                'db_stay', 'db_peaches', 'db_blinding_lights', 'db_bad_guy'
            ]
        },
        {
            id: 'romantic',
            name: 'Romantic',
            desc: 'Love songs to set the perfect mood.',
            icon: 'fa-heart',
            gradient: 'promo-gradient-4',
            songIds: [
                'db_someone_you_loved', 'db_fly_me_to_moon', 'db_feeling_good',
                'db_what_a_wonderful', 'db_flowers', 'db_peaches',
                'db_as_it_was', 'db_perfect', 'db_lofi_1', 'db_sweater_weather'
            ]
        },
        {
            id: '90s',
            name: '90s Classics',
            desc: 'The iconic tracks that defined a decade.',
            icon: 'fa-compact-disc',
            gradient: 'promo-gradient-5',
            songIds: [
                'db_teen_spirit', 'db_hotel_california', 'db_bohemian',
                'db_eye_tiger', 'db_thunderstruck', 'db_fly_me_to_moon',
                'db_feeling_good', 'db_what_a_wonderful', 'db_mr_brightside'
            ]
        }
    ],

    // ─────────────────────────────────────────────────────────────────────────
    // GENRES (for filtering / discovery)
    // ─────────────────────────────────────────────────────────────────────────
    genres: ['Pop', 'Rock', 'Hip-Hop', 'Indie', 'EDM', 'Jazz', 'Lo-fi'],

    // ─────────────────────────────────────────────────────────────────────────
    // HELPERS
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Get an array of song objects by their IDs.
     * Skips any IDs that don't exist in the database.
     */
    getSongsByIds(ids) {
        return ids
            .map(id => this.songs.find(s => s.id === id))
            .filter(Boolean);
    },

    /**
     * Get a playlist object by its id string.
     */
    getPlaylist(id) {
        return this.playlists.find(p => p.id === id) || null;
    },

    /**
     * Get the full song objects for a given playlist id.
     */
    getPlaylistSongs(id) {
        const pl = this.getPlaylist(id);
        if (!pl) return [];
        return this.getSongsByIds(pl.songIds);
    },

    /**
     * Converts a MUSIC_DB song into the track shape the player expects.
     * Adds the genius URL field as null (backend will look it up via Genius search).
     */
    toTrack(song) {
        return {
            id: song.id,
            title: song.title,
            artist: song.artist,
            album: song.album || '',
            thumbnail: song.thumbnail,
            duration: song.duration || '0:00',
            genre: song.genre || '',
            url: null, // Genius URL — backend resolves via search
            youtubeQuery: song.youtubeQuery || `${song.artist} ${song.title} official audio`
        };
    },

    /**
     * Get all songs as player-ready track objects.
     */
    getAllTracks() {
        return this.songs.map(s => this.toTrack(s));
    },

    /**
     * Get all songs for a playlist as player-ready track objects.
     */
    getPlaylistTracks(id) {
        return this.getPlaylistSongs(id).map(s => this.toTrack(s));
    }
};
