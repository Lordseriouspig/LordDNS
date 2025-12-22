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

module.exports = function parseHeader(buf) {
    if (buf.length < 12) {
        throw new Error('Buffer too short');
    }
    
    // Read Transaction ID
    const transactionID = buf.readUInt16BE(0);

    // Read Flags
    const flags = buf.readUInt16BE(2);

    const qr = (flags >> 15) & 0b1;
    const opcode = (flags >> 11) & 0b1111;
    const aa = (flags >> 10) & 0b1;
    const tc = (flags >> 9) & 0b1;
    const rd = (flags >> 8) & 0b1;
    const ra = (flags >> 7) & 0b1;
    const z = (flags >> 4) & 0b111;
    const rcode = flags & 0b1111;

    // Read counts
    const qdcount = buf.readUInt16BE(4);
    const ancount = buf.readUInt16BE(6);
    const nscount = buf.readUInt16BE(8);
    const arcount = buf.readUInt16BE(10);

    // Return everything
    console.log('Parsed Header:', [transactionID, qr, opcode, aa, tc, rd, ra, z, rcode, qdcount, ancount, nscount, arcount]);
    return [transactionID, qr, opcode, aa, tc, rd, ra, z, rcode, qdcount, ancount, nscount, arcount];
}