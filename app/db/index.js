// Copyright (C) 2025 Lordseriouspig
// 
// This file is part of LordDNS.
// 
// LordDNS is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
// 
// LordDNS is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
// 
// You should have received a copy of the GNU General Public License
// along with LordDNS.  If not, see <https://www.gnu.org/licenses/>.

const Database = require('better-sqlite3')
const path = require('path');

const dbPath = path.join(__dirname, '../../data/records.db');
const db = new Database(dbPath);

db.prepare(`
    CREATE TABLE IF NOT EXISTS records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        domain TEXT NOT NULL,
        type INTEGER NOT NULL,
        value TEXT NOT NULL,
        ttl INTEGER DEFAULT 60,
        created INTEGER DEFAULT (strftime('%s','now')),
        updated INTEGER DEFAULT (strftime('%s','now'))
    )`).run();

if (db.prepare('SELECT COUNT(*) AS count FROM records').get().count === 0) {
    seedDatabase();
}

function getRecords(domain, type = 1) {
    return db.prepare('SELECT * FROM records WHERE domain = ? AND type = ?').all(domain, type);
}
function getAllRecords() {
    return db.prepare('SELECT * FROM records').all();
}
function domainExists(domain) {
    return db.prepare(
        'SELECT 1 FROM records WHERE domain = ? LIMIT 1'
    ).get(domain);
}
function addRecord(domain, type, value, ttl = 60) {
    return db.prepare(`
        INSERT INTO records (domain, type, value, ttl)
        VALUES (?, ?, ?, ?)
    `).run(domain, type, value, ttl);
}
function updateRecord(id, domain, type, value, ttl) {
    return db.prepare(`
        UPDATE records SET domain = ?, type = ?, value = ?, ttl = ?, updated = strftime('%s','now') WHERE id = ?
    `).run(domain, type, value, ttl, id);
}
function deleteRecord(domain, type) {
    return db.prepare('DELETE FROM records WHERE domain = ? AND type = ?').run(domain, type);
}
function seedDatabase() {
    const records = [
        { domain: 'localhost', type: 1, value: '127.0.0.1', ttl: 60 },
        { domain: 'localhost', type: 28, value: '::1', ttl: 60 },
        { domain: 'localhost', type: 2, value: 'localhost', ttl: 60 },
        { domain: '127.0.0.1.in-addr.arpa', type: 12, value: 'localhost', ttl: 60 },

        { domain: 'LordDNS', type: 1, value: `${process.env.DNS_SERVER}`, ttl: 60 },
        { domain: 'LordDNS', type: 28, value: `${process.env.DNS_IPv6_SERVER}`, ttl: 60 },
        { domain: '1.0.0.127.in-addr.arpa', type: 12, value: 'LordDNS', ttl: 60 },

        { domain: 'example.com', type: 1, value: '104.18.26.120', ttl: 300 },
        { domain: 'example.com', type: 1, value: '104.18.27.120', ttl: 300 },
        { domain: 'example.com', type: 28, value: '2606:4700:20::6812:1a78', ttl: 300 },
        { domain: 'example.com', type: 28, value: '2606:4700:20::6812:1b78', ttl: 300 },
        { domain: 'example.com', type: 2, value: 'elliott.ns.cloudflare.com', ttl: 300 },
        { domain: 'example.com', type: 2, value: 'hera.ns.cloudflare.com', ttl: 300 },
        { domain: 'elliott.ns.cloudflare.com', type: 1, value: '108.162.195.228', ttl: 300 },
        { domain: 'elliott.ns.cloudflare.com', type: 1, value: '172.64.35.228', ttl: 300 },
        { domain: 'elliott.ns.cloudflare.com', type: 1, value: '162.159.44.228', ttl: 300 },
        { domain: 'elliott.ns.cloudflare.com', type: 28, value: '2803:f800:50::6ca2:c3e4', ttl: 300 },
        { domain: 'elliott.ns.cloudflare.com', type: 28, value: '2606:4700:58::a29f:2ce4', ttl: 300 },
        { domain: 'elliott.ns.cloudflare.com', type: 28, value: '2a06:98c1:50::ac40:23e4', ttl: 300 },
        { domain: 'hera.ns.cloudflare.com', type: 1, value: '173.245.58.162', ttl: 300 },
        { domain: 'hera.ns.cloudflare.com', type: 1, value: '172.64.32.162', ttl: 300 },
        { domain: 'hera.ns.cloudflare.com', type: 1, value: '108.162.192.162', ttl: 300 },
        { domain: 'hera.ns.cloudflare.com', type: 28, value: '2606:4700:50::adf5:3aa2', ttl: 300 },
        { domain: 'hera.ns.cloudflare.com', type: 28, value: '2803:f800:50::6ca2:c0a2', ttl: 300 },
        { domain: 'hera.ns.cloudflare.com', type: 28, value: '2a06:98c1:50::ac40:20a2', ttl: 300 },
        { domain: 'example.com', type: 6, value: 'elliott.ns.cloudflare.com admin.example.com 2391652032 10000 2400 604800 1800', ttl: 300 },
    ];

    for (const record of records) {
        addRecord(record.domain, record.type, record.value, record.ttl);
    }
}

module.exports = { getRecords, getAllRecords, addRecord, updateRecord, deleteRecord, domainExists };