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

const buildQuestion = require('./build_question'); // dont mind me reusing logic
const TYPE_HANDLERS = {
    1: { name: 'A', format: (value) => Buffer.from(value.split('.').map(Number)) },
    28: { name: 'AAAA', format: (value) => {
        const parts = value.split(':');
        const buf = Buffer.alloc(16);
        let offset = 0;

        const emptyIndex = parts.indexOf('');
        if (emptyIndex !== -1) {
            const missing = 8 - (parts.length - 1);
            parts.splice(emptyIndex, 1, ...Array(missing).fill('0'));
        }

        for (const part of parts) {
            const n = parseInt(part, 16) || 0;
            buf.writeUInt16BE(n, offset);
            offset += 2;
        }

        return buf;
    }},
    5: { name: 'CNAME', format: (value) => {
        return buildQuestion([value, 1, 1]);
    }},
    15: { name: 'MX', format: (value) => {
        const [preference, exchange] = value.split(' ');
        const prefBuf = Buffer.alloc(2);
        prefBuf.writeUInt16BE(parseInt(preference), 0);
        const exchangeBuf = buildQuestion([exchange, 1, 1]);
        return Buffer.concat([prefBuf, exchangeBuf]);
    }},
    16: { name: 'TXT', format: (value) => {
        const strBuf = Buffer.from(value, 'utf8');
        const lenBuf = Buffer.from([strBuf.length]);
        return Buffer.concat([lenBuf, strBuf]);
    }},
    2: { name: 'NS', format: (value) => {
        return buildQuestion([value, 1, 1]);
    }},
    6: { name: 'SOA', format: (value) => {
        const [mname, rname, serial, refresh, retry, expire, minimum] = value.split(' ');

        const mnameBuf = buildQuestion([mname, 1, 1]); // domain
        const rnameBuf = buildQuestion([rname, 1, 1]); // domain

        const intBufs = [serial, refresh, retry, expire, minimum].map(n => {
            const buf = Buffer.alloc(4);
            buf.writeUInt32BE(parseInt(n));
            return buf;
        });
        return Buffer.concat([mnameBuf, rnameBuf, ...intBufs]);
    }},
    12: { name: 'PTR', format: (value) => {
        return buildQuestion([value, 1, 1]);
    }}
};
module.exports = TYPE_HANDLERS;