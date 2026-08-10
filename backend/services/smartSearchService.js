/**
 * smartSearchService.js
 *
 * Intelligent multilingual lyrics search engine.
 * Supports Hinglish, Punjabi, Urdu romanization, and mixed-language queries
 * with fuzzy matching, phonetic normalization, transliteration variants,
 * and typo tolerance.
 *
 * Fallback order: LRCLIB → Deezer → Genius
 */

const axios = require('axios');
const { searchSongs } = require('./geniusServices');

// ═══════════════════════════════════════════════════════════════════════════════
// 1. TEXT NORMALIZATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Normalizes text for comparison: lowercase, remove accents,
 * strip punctuation / apostrophes, collapse whitespace.
 */
function normalizeText(text) {
    if (!text) return '';
    return text
        .toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')   // accent-insensitive
        .replace(/[''`'\u2018\u2019\u2032]/g, '')            // remove apostrophes
        .replace(/[^\w\s]/g, ' ')                            // punctuation → space
        .replace(/\s+/g, ' ')                                // collapse whitespace
        .trim();
}

// ═══════════════════════════════════════════════════════════════════════════════
// 2. PHONETIC NORMALIZATION  (Hindi / Punjabi / Urdu Romanization)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Produces a "phonetic fingerprint" by collapsing aspirated consonants,
 * long vowel digraphs, and repeated letters.  Used as ONE of the search
 * variations — the original query is always preserved so English queries
 * are never degraded.
 */
function phoneticNormalize(text) {
    let s = normalizeText(text);

    // Aspirated consonant clusters → base  (longest patterns first)
    s = s.replace(/chh/g, 'ch')
         .replace(/kh/g, 'k')
         .replace(/gh/g, 'g')
         .replace(/jh/g, 'j')
         .replace(/th/g, 't')
         .replace(/dh/g, 'd')
         .replace(/bh/g, 'b')
         .replace(/ph/g, 'f')
         .replace(/sh/g, 's');

    // Long vowel digraphs → short vowel
    s = s.replace(/aa/g, 'a')
         .replace(/ee/g, 'i')
         .replace(/oo/g, 'u')
         .replace(/ai/g, 'e')
         .replace(/ei/g, 'e')
         .replace(/au/g, 'o')
         .replace(/ou/g, 'o');

    // Collapse repeated letters  (e.g. "pyaar" → "pyar" after aa→a)
    s = s.replace(/(.)\1+/g, '$1');

    return s;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 3. TRANSLITERATION VARIATION GENERATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Common word-level spelling variations across Hindi, Punjabi, and Urdu
 * romanizations.  Key → array of alternative spellings.
 */
const WORD_VARIANTS = {
    // Hindi
"tera": ["tere","teri","tora"],
"meri": ["mere","mera"],
"dil": ["dill"],
"mohabbat": ["mohabat","muhabbat"],
"chaahat": ["chahat"],
"chahat": ["chaahat"],
"pyaar": ["pyar","piar","piaar"],
"pyar": ["pyaar","piar"],
"zindagi": ["jindagi","zindgi"],
"jindagi": ["zindagi"],
"yaad": ["yad"],
"aankhon": ["ankhon","ankho"],
"baatein": ["batein","baaten"],
"jana": ["jaana"],
"banale": ["bana le","bna le"],
"banja": ["ban ja"],
"banjaunga": ["ban jaunga","banjaunga"],
"chaahunga": ["chahunga"],
"chaahte": ["chahte"],
"tere bina": ["tera bina"],

// Punjabi
"kive": ["kiven","kivein"],
"kiven": ["kive"],
"ni": ["nee"],
"ve": ["vey"],
"yaar": ["yar"],
"sohneya": ["soniya","sohnya"],
"gabru": ["gabroo"],
"jatt": ["jat"],
"mutiyar": ["mutiyaar"],
"sajjna": ["sajna"],
"nachdi": ["nachdii"],
"gaddi": ["gadi"],
"mitran": ["mitraan"],
"akh": ["akhh"],
"akhiyan": ["ankhiya"],
"chan": ["chann"],
"maahi": ["mahi"],
"rabb": ["rab"],

// English shortcuts
"feat": ["ft"],
"ft": ["feat"],
"and": ["&"],
    // ── Pronouns & particles ──────────────────────────────────────────────
    'main':  ['mai', 'mein'],
    'mai':   ['main', 'mein'],
    'mein':  ['main', 'mai'],
    'me':    ['mai', 'main', 'mein'],
    'hai':   ['he', 'hain', 'hay'],
    'he':    ['hai'],
    'hain':  ['hai'],
    'tu':    ['tum', 'tujh'],
    'tum':   ['tu'],
    'hum':   ['ham'],
    'ham':   ['hum'],
    'ye':    ['yeh', 'yah'],
    'yeh':   ['ye', 'yah'],
    'wo':    ['woh', 'voh', 'vo'],
    'woh':   ['wo', 'voh'],
    'voh':   ['wo', 'woh'],
    'kya':   ['kia', 'kyaa'],
    'kia':   ['kya'],

    // ── Possessives / postpositions ───────────────────────────────────────
    'mera':  ['mere', 'meri'],
    'mere':  ['mera', 'meri'],
    'meri':  ['mera', 'mere'],
    'tera':  ['tere', 'teri'],
    'tere':  ['tera', 'teri'],
    'teri':  ['tera', 'tere'],
    'apna':  ['apnaa', 'apne'],
    'ka':    ['ke', 'ki'],
    'ke':    ['ka', 'ki'],
    'ki':    ['ka', 'ke'],
    'se':    ['say'],
    'ko':    ['ku'],
    'pe':    ['par'],
    'na':    ['naa'],

    // ── Oblique / dative ─────────────────────────────────────────────────
    'tujhe': ['tujh', 'tuje'],
    'mujhe': ['mujh', 'muje'],

    // ── Negation ─────────────────────────────────────────────────────────
    'nahi':  ['nahin', 'nai', 'nhi'],
    'nahin': ['nahi', 'nai'],
    'nai':   ['nahi', 'nahin'],

    // ── Common verbs & stems ─────────────────────────────────────────────
    'phir':  ['fir'],
    'fir':   ['phir'],
    'bhi':   ['vi', 'bhe'],
    'aur':   ['or', 'aor'],
    'le':    ['ley', 'lein'],
    'de':    ['dey', 'dein'],
    'ho':    ['hoo'],
    'ja':    ['jaa'],
    'aa':    ['aaja', 'aao'],
    'ban':   ['baan'],
    'bana':  ['banaa', 'bna'],
    'kar':   ['karo', 'kare'],
    'bol':   ['bolo', 'bole'],
    'sun':   ['suno', 'sune'],
    'chal':  ['chalo', 'chale'],
    'raha':  ['rahi', 'rahe'],

    // ── Common nouns ─────────────────────────────────────────────────────
    'dil':     ['dill'],
    'pyar':    ['pyaar', 'piar', 'piaar'],
    'pyaar':   ['pyar', 'piar'],
    'ishq':    ['ishk', 'isq'],
    'zindagi': ['zindgi', 'jindagi', 'jindgi'],
    'jindagi': ['zindagi', 'zindgi'],
    'duniya':  ['dunia', 'duniyaa'],
    'raat':    ['rat'],
    'gham':    ['gam'],
    'khuda':   ['kuda'],
    'sapna':   ['sapne', 'sapnaa'],

    // ── Verb suffixes / endings ──────────────────────────────────────────
    'jaunga':   ['jaaunga', 'jaaonga'],
    'chahne':   ['chahane', 'chahna'],
    'chahunga': ['chaahunga', 'chahoonga'],
    'lage':     ['lagey', 'lagi'],
    'chahein':  ['chahe', 'chahiye'],
};

/**
 * Generates up to `max` distinct search-query variations from the input.
 * Always includes: normalised form and phonetic form.
 * Then applies one word-level substitution at a time.
 */
function generateVariations(query, max = 5) {
    const normalized = normalizeText(query);
    const phonetic   = phoneticNormalize(query);

    const seen = new Set();
    const variations = [];

    function add(v) {
        if (v && !seen.has(v) && variations.length < max) {
            seen.add(v);
            variations.push(v);
        }
    }

    add(normalized);
    if (phonetic !== normalized) add(phonetic);

    // Word-level substitution variants
    const words = normalized.split(' ');
    for (let i = 0; i < words.length && variations.length < max; i++) {
        const alts = WORD_VARIANTS[words[i]];
        if (alts) {
            for (const alt of alts) {
                const copy = [...words];
                copy[i] = alt;
                add(copy.join(' '));
                if (variations.length >= max) break;
            }
        }
    }

    return variations;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 4. STRING SIMILARITY  (Levenshtein + helpers)
// ═══════════════════════════════════════════════════════════════════════════════

/** Classic Levenshtein edit distance. */
function levenshtein(a, b) {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;
    const m = [];
    for (let i = 0; i <= b.length; i++) m[i] = [i];
    for (let j = 0; j <= a.length; j++) m[0][j] = j;
    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            const cost = b[i - 1] === a[j - 1] ? 0 : 1;
            m[i][j] = Math.min(
                m[i - 1][j] + 1,
                m[i][j - 1] + 1,
                m[i - 1][j - 1] + cost
            );
        }
    }
    return m[b.length][a.length];
}

/** 0‒1 fuzzy similarity.  1 = identical. */
function fuzzySimilarity(a, b) {
    if (!a || !b) return 0;
    const na = normalizeText(a);
    const nb = normalizeText(b);
    if (na === nb) return 1.0;
    const maxLen = Math.max(na.length, nb.length);
    if (maxLen === 0) return 1.0;
    return 1 - levenshtein(na, nb) / maxLen;
}

/** Word-overlap Jaccard score. */
function wordOverlap(a, b) {
    if (!a || !b) return 0;
    const wA = new Set(normalizeText(a).split(/\s+/));
    const wB = new Set(normalizeText(b).split(/\s+/));
    let intersect = 0;
    for (const w of wA) if (wB.has(w)) intersect++;
    const union = new Set([...wA, ...wB]).size;
    return union > 0 ? intersect / union : 0;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 5. SEARCH PROVIDERS
// ═══════════════════════════════════════════════════════════════════════════════

async function searchLRCLIB(query) {
    try {
        const { data } = await axios.get(
            `https://lrclib.net/api/search?q=${encodeURIComponent(query)}`,
            { headers: { 'User-Agent': 'MusicPlayer/1.0' }, timeout: 8000 }
        );
        if (!Array.isArray(data) || !data.length) return [];
        return data.map(item => ({
            id:        `lrclib_${item.id}`,
            title:     item.trackName || item.name || '',
            artist:    item.artistName || '',
            album:     item.albumName || '',
            thumbnail: null,
            image:     null,
            url:       null,
            path:      null,
            source:    'LRCLIB'
        }));
    } catch (err) {
        return [];
    }
}

async function searchDeezer(query) {
    try {
        const { data } = await axios.get(
            `https://api.deezer.com/search?q=${encodeURIComponent(query)}&limit=10`,
            { timeout: 8000 }
        );
        if (!data || !Array.isArray(data.data) || !data.data.length) return [];
        return data.data.map(item => ({
            id:        `deezer_${item.id}`,
            title:     item.title || '',
            artist:    (item.artist && item.artist.name) || '',
            album:     (item.album && item.album.title) || '',
            thumbnail: (item.album && item.album.cover_medium) || null,
            image:     (item.album && item.album.cover_big) || null,
            url:       null,
            path:      null,
            source:    'Deezer'
        }));
    } catch (err) {
        return [];
    }
}

async function searchGenius(query) {
    try {
        const songs = await searchSongs(query);
        return (songs || []).map(s => ({
            id:        s.id,
            title:     s.title || '',
            artist:    s.artist || '',
            album:     s.album || '',
            thumbnail: s.thumbnail || null,
            image:     s.image || null,
            url:       s.url || null,
            path:      s.path || null,
            source:    'Genius'
        }));
    } catch (err) {
        return [];
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 6. DEDUPLICATION
// ═══════════════════════════════════════════════════════════════════════════════

function areDuplicates(a, b) {
    const titleSim  = fuzzySimilarity(a.title, b.title);
    const artistSim = fuzzySimilarity(a.artist, b.artist);
    return titleSim >= 0.75 && artistSim >= 0.4;
}

/**
 * Removes duplicate songs, merging metadata (e.g. keeping the record that
 * has album art) when a duplicate is found.
 */
function deduplicateResults(songs) {
    const unique = [];
    for (const song of songs) {
        const dupIdx = unique.findIndex(u => areDuplicates(u, song));
        if (dupIdx === -1) {
            unique.push(song);
        } else {
            // Merge: prefer the record with more metadata
            const existing = unique[dupIdx];
            if (!existing.thumbnail && song.thumbnail) {
                unique[dupIdx] = {
                    ...existing,
                    thumbnail: song.thumbnail,
                    image: song.image
                };
            }
        }
    }
    return unique;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 7. RELEVANCE SCORING
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Scores a single result against the original query and all generated
 * variations.  Higher = more relevant.
 *
 * Priority:
 *   1. Exact title match            (+100)
 *   2. Title contains query         (+80)
 *   3. Variation exact match        (+90)
 *   4. Phonetic match               (+85)
 *   5. Fuzzy similarity             (+0‒40)
 *   6. Word overlap                 (+0‒30)
 *   7. Artist keyword bonus         (+10)
 *   8. Metadata completeness bonus  (+2‒5)
 */
function scoreResult(song, originalQuery, variations) {
    let score = 0;
    const nTitle  = normalizeText(song.title);
    const nArtist = normalizeText(song.artist);
    const nQuery  = normalizeText(originalQuery);

    // ── Exact & substring matches against original query ──────────────────
    if (nTitle === nQuery)                                 score += 100;
    else if (nTitle.includes(nQuery))                      score += 80;
    else if (nQuery.includes(nTitle) && nTitle.length > 2) score += 70;

    // ── Matches against variations ───────────────────────────────────────
    for (const v of variations) {
        if (nTitle === v)                                  score = Math.max(score, 90);
        else if (nTitle.includes(v))                       score = Math.max(score, 75);
        else if (v.includes(nTitle) && nTitle.length > 2)  score = Math.max(score, 65);
    }

    // ── Phonetic fingerprint comparison ──────────────────────────────────
    const pTitle = phoneticNormalize(song.title);
    const pQuery = phoneticNormalize(originalQuery);
    if (pTitle === pQuery)                                 score = Math.max(score, 85);
    else if (pTitle.includes(pQuery) || pQuery.includes(pTitle))
                                                           score = Math.max(score, 60);

    // ── Fuzzy string similarity ──────────────────────────────────────────
    score += fuzzySimilarity(song.title, originalQuery) * 40;

    // ── Word overlap ─────────────────────────────────────────────────────
    score += wordOverlap(song.title, originalQuery) * 30;

    // ── Artist keyword bonus ─────────────────────────────────────────────
    const queryWords = nQuery.split(/\s+/);
    for (const w of queryWords) {
        if (w.length > 2 && nArtist.includes(w)) { score += 10; break; }
    }

    // ── Metadata completeness bonus ──────────────────────────────────────
    if (song.thumbnail) score += 5;
    if (song.album)     score += 2;
    // Album artwork bonus
if (song.image) score += 3;

// LRCLIB results generally contain better lyric mapping
if (song.source === "LRCLIB") score += 5;

// Deezer metadata is reliable
if (song.source === "Deezer") score += 3;

// Genius as final fallback
if (song.source === "Genius") score += 2;

    // Popular artist bonus
const POPULAR_ARTISTS = [
    "arijit singh",
    "karan aujla",
    "ap dhillon",
    "sidhu moosewala",
    "shubh",
    "diljit dosanjh",
    "yo yo honey singh",
    "atif aslam",
    "jubin nautiyal",
    "kk",
    "armaan malik",
    "pritam",
    "vishal mishra",
    "ed sheeran",
    "taylor swift",
    "adele",
    "eminem",
    "drake",
    "the weeknd",
    "justin bieber",
    "bruno mars",
    "billie eilish"
];

if (POPULAR_ARTISTS.includes(nArtist)) {
    score += 25;
}

    return score;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 8. MAIN INTELLIGENT SEARCH ORCHESTRATOR
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Performs an intelligent multilingual lyrics search.
 *
 * Pipeline:
 *   1. Generate query variations (normalised, phonetic, transliteration)
 *   2. Fan-out: search LRCLIB + Deezer with every variation in parallel
 *   3. If nothing found → fall back to Genius
 *   4. Deduplicate across providers (merge metadata)
 *   5. Score every result for relevance
 *   6. Sort descending and return
 *
 * @param {string} query  The user's raw search text
 * @returns {Promise<Array>} Ranked array of song objects
 */
async function intelligentLyricsSearch(query) {
    const variations = generateVariations(query, 15);

    // ── Fan-out: LRCLIB + Deezer with every variation, all in parallel ───
    const promises = [];
    for (const v of variations) {
        promises.push(searchLRCLIB(v));
        promises.push(searchDeezer(v));
    }

    const settled = await Promise.allSettled(promises);
    let allSongs = settled
        .filter(r => r.status === 'fulfilled')
        .flatMap(r => r.value);

    // ── Fallback: Genius (currently blocked by Cloudflare but kept) ──────
    if (allSongs.length === 0) {
        for (const v of variations.slice(0, 2)) {
            const gResults = await searchGenius(v);
            allSongs.push(...gResults);
            if (allSongs.length > 0) break;
        }
    }

    // ── Deduplicate across providers ─────────────────────────────────────
    const unique = deduplicateResults(allSongs);

    // ── Score & rank ─────────────────────────────────────────────────────
    const scored = unique.map(song => ({
        ...song,
        _score: scoreResult(song, query, variations)
    }));
  scored.sort((a, b) => {

    if (b._score !== a._score) {
        return b._score - a._score;
    }

    return a.title.localeCompare(b.title);

});  

    // Strip internal score and return
    return scored.map(({ _score, ...song }) => song);
}

module.exports = { intelligentLyricsSearch };
