/**
 * Local JSON File Database for Liked Songs
 * Stored in backend/data/likedSongs.json
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../data');
const FILE = path.join(DATA_DIR, 'likedSongs.json');

function ensure() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(FILE)) fs.writeFileSync(FILE, JSON.stringify([], null, 2), 'utf8');
}

function readAll() {
  ensure();
  try {
    return JSON.parse(fs.readFileSync(FILE, 'utf8'));
  } catch {
    return [];
  }
}

function writeAll(items) {
  ensure();
  fs.writeFileSync(FILE, JSON.stringify(items, null, 2), 'utf8');
}

function stableId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

module.exports = {
  findByUser(userId) {
    return readAll().filter(s => s.userId === userId);
  },

  findOne(userId, youtubeId) {
    return readAll().find(s => s.userId === userId && s.youtubeId === youtubeId) || null;
  },

  addOne(song) {
    const all = readAll();
    if (all.find(s => s.userId === song.userId && s.youtubeId === song.youtubeId)) {
      const err = new Error('Duplicate');
      err.code = 11000;
      throw err;
    }
    const toInsert = { ...song, likedAt: song.likedAt || new Date().toISOString(), _id: stableId() };
    all.push(toInsert);
    writeAll(all);
    return toInsert;
  },

  addMany(songs) {
    const all = readAll();
    const existing = new Set(all.filter(s => s.userId === songs[0]?.userId).map(s => s.youtubeId));
    const inserted = [];
    for (const s of songs) {
      if (existing.has(s.youtubeId)) continue;
      const toInsert = { ...s, likedAt: s.likedAt || new Date().toISOString(), _id: stableId() };
      inserted.push(toInsert);
      all.push(toInsert);
    }
    writeAll(all);
    return inserted;
  },

  removeOne(userId, youtubeId) {
    const all = readAll();
    const before = all.length;
    const filtered = all.filter(s => !(s.userId === userId && s.youtubeId === youtubeId));
    writeAll(filtered);
    return { deletedCount: before - filtered.length };
  },

  removeAll(userId) {
    const all = readAll();
    const filtered = all.filter(s => s.userId !== userId);
    writeAll(filtered);
    return { deletedCount: all.length - filtered.length };
  }
};

