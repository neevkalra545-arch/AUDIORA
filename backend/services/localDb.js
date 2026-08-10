/**
 * Local JSON File Database
 * ─────────────────────────
 * Works instantly with zero configuration — no MongoDB needed.
 * All user data is stored in backend/data/users.json
 *
 * When you're ready to go live, replace this with MongoDB Atlas
 * by updating server.js to use mongoose instead.
 */

const fs   = require('fs');
const path = require('path');

const DATA_DIR  = path.join(__dirname, '../data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

// Ensure data directory and file exist
function ensureFile() {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    if (!fs.existsSync(USERS_FILE)) fs.writeFileSync(USERS_FILE, '[]', 'utf8');
}

function readUsers() {
    ensureFile();
    try {
        return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
    } catch {
        return [];
    }
}

function writeUsers(users) {
    ensureFile();
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
}

function findAll() {
    return readUsers();
}

module.exports = {
    // Find one user by a filter object e.g. { email: 'x@x.com' }
    findOne(filter) {
        const users = readUsers();
        return users.find(u => {
            return Object.keys(filter).every(k => u[k] === filter[k]);
        }) || null;
    },

    // Find by id (string)
    findById(id) {
        const users = readUsers();
        return users.find(u => u._id === id) || null;
    },

    // Create a new user document
    create(data) {
        const users = readUsers();
        const newUser = {
            _id: Date.now().toString(36) + Math.random().toString(36).slice(2),
            ...data,
            createdAt: new Date().toISOString()
        };
        users.push(newUser);
        writeUsers(users);
        return newUser;
    },

    // Update one user matching filter, return updated user
    updateOne(filter, updates) {
        const users = readUsers();
        const idx = users.findIndex(u =>
            Object.keys(filter).every(k => u[k] === filter[k])
        );
        if (idx === -1) return null;
        users[idx] = { ...users[idx], ...updates };
        writeUsers(users);
        return users[idx];
    },

    // Find all users (useful for reset-token checks in JSON DB)
    findAll() {
        return readUsers();
    },

    // Save (update by _id)
    save(user) {
        const users = readUsers();
        const idx = users.findIndex(u => u._id === user._id);
        if (idx === -1) {
            users.push(user);
        } else {
            users[idx] = { ...user };
        }
        writeUsers(users);
        return user;
    }
};

