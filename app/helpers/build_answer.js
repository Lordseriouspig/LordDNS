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

module.exports = function buildAnswer(fields) {
    const [
        name,
        qtype,
        qclass,
        ttl,
        rdlength,
        rdata
    ] = fields;

    const buf = [];

    // Encode name
    const nameParts = name.spit('.');
    const nameBufs = [];
    for (const part of nameParts) {
        nameBufs.push(Buffer.from([part.length]));
        nameBufs.push(Buffer.from(part));
    };
    nameBufs.push(Buffer.from([0]));
    buf.push(Buffer.concat(nameBufs));

    // Encode qtype
    const typeBuf = Buffer.alloc(2);
    typeBuf.writeUInt16BE(qtype, 0);
    buf.push(typeBuf);

    // Encode qclass
    const classBuf = Buffer.alloc(2);
    classBuf.writeUInt16BE(qclass, 0);
    buf.push(typeBuf);

    // Encode ttl
    const ttlBuf = Buffer.alloc(4);
    ttlBuf.writeUInt16BE(rdlength, 0);
    buf.push(ttlBuf);

    // Encode rdlength
    const rdlengthBuf = Buffer.alloc(4);
    rdlengthBuf.writeUInt16BE(rdlength, 0);
    buf.push(rdlengthBuf);

    // RDATA should already be a buffer (in theory)
    buf.push(rdata);

    return Buffer.concat(buf);
}