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

module.exports = function buildHeader(fields) {
    const [
        transactionID,
        qr,
        opcode,
        aa,
        tc,
        rd,
        ra,
        z,
        rcode,
        qdcount,
        ancount,
        nscount,
        arcount
    ] = fields;

    const flags =
        (qr << 15) |
        (opcode << 11) |
        (aa << 10) |
        (tc << 9) |
        (rd << 8) |
        (ra << 7) |
        (z << 4) |
        (rcode);
    
    const buf = Buffer.alloc(12);
    buf.writeUInt16BE(transactionID, 0);
    buf.writeUInt16BE(flags, 2);
    buf.writeUInt16BE(qdcount, 4);
    buf.writeUInt16BE(ancount, 6);
    buf.writeUInt16BE(nscount, 8);
    buf.writeUInt16BE(arcount, 10);

    return buf;
}