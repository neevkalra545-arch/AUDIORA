/**
 * Local JSON File Database for Playlists
 * Stored in backend/data/playlists.json
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../data');
const FILE = path.join(DATA_DIR, 'playlists.json');

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
    return readAll().filter(p => p.userId === userId);
  },

  findById(id) {
    return readAll().find(p => p._id === id) || null;
  },

  findOne(userId, id) {
    return readAll().find(p => p.userId === userId && p._id === id) || null;
  },

  create(playlist) {
    const all = readAll();
    const toInsert = {
      ...playlist,
      _id: stableId(),
      songs: playlist.songs || [],
      totalDuration: playlist.totalDuration || 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    all.push(toInsert);
    writeAll(all);
    return toInsert;
  },

  update(id, updates) {
    const all = readAll();
    const idx = all.findIndex(p => p._id === id);
    if (idx === -1) return null;
    all[idx] = { ...all[idx], ...updates, updatedAt: new Date().toISOString() };
    writeAll(all);
    return all[idx];
  },

  removeOne(userId, id) {
    const all = readAll();
    const before = all.length;
    const filtered = all.filter(p => !(p.userId === userId && p._id === id));
    writeAll(filtered);
    return { deletedCount: before - filtered.length };
  }
};
