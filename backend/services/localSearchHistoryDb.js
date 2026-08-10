/**
 * Local JSON File Database for Search History
 * Stored in backend/data/searchHistory.json
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../data');
const FILE = path.join(DATA_DIR, 'searchHistory.json');

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
  findByUser(userId, searchType) {
    let all = readAll().filter(s => s.userId === userId);
    if (searchType) all = all.filter(s => s.searchType === searchType);
    return all.sort((a, b) => new Date(b.searchedAt) - new Date(a.searchedAt));
  },

  addSearch(userId, query, searchType, results) {
    const all = readAll();
    const toInsert = {
      _id: stableId(),
      userId,
      query,
      searchType,
      results,
      searchedAt: new Date().toISOString()
    };
    all.push(toInsert);
    writeAll(all);
    return toInsert;
  },

  getUnique(userId, searchType, limit) {
    let all = readAll().filter(s => s.userId === userId);
    if (searchType) all = all.filter(s => s.searchType === searchType);
    
    // Group by query to find latest
    const grouped = {};
    for (const s of all) {
      if (!grouped[s.query] || new Date(s.searchedAt) > new Date(grouped[s.query].lastSearched)) {
        grouped[s.query] = { _id: s.query, lastSearched: s.searchedAt };
      }
    }
    
    return Object.values(grouped)
      .sort((a, b) => new Date(b.lastSearched) - new Date(a.lastSearched))
      .slice(0, limit);
  },

  removeOne(userId, searchId) {
    const all = readAll();
    const before = all.length;
    const filtered = all.filter(s => !(s.userId === userId && s._id === searchId));
    writeAll(filtered);
    return { deletedCount: before - filtered.length };
  },

  removeAll(userId) {
    const all = readAll();
    const filtered = all.filter(s => s.userId !== userId);
    writeAll(filtered);
    return { deletedCount: all.length - filtered.length };
  },

  getStats(userId) {
    const all = readAll().filter(s => s.userId === userId);
    const stats = {};
    for (const s of all) {
      if (!stats[s.searchType]) {
        stats[s.searchType] = { _id: s.searchType, count: 0, lastSearch: s.searchedAt };
      }
      stats[s.searchType].count++;
      if (new Date(s.searchedAt) > new Date(stats[s.searchType].lastSearch)) {
        stats[s.searchType].lastSearch = s.searchedAt;
      }
    }
    return Object.values(stats).sort((a, b) => b.count - a.count);
  },

  count(userId) {
    return readAll().filter(s => s.userId === userId).length;
  },

  getSuggestions(userId, prefix, limit) {
    const all = readAll().filter(s => s.userId === userId);
    const lowerPrefix = prefix.toLowerCase();
    const matches = all.filter(s => s.query.toLowerCase().startsWith(lowerPrefix));
    const uniqueMatches = [...new Set(matches.map(m => m.query))];
    return uniqueMatches.slice(0, limit);
  }
};
