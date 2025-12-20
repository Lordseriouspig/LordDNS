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

module.export = function buildQuestion(domainName, qtype, qclass) {
    const labels = domainName.split('.');
    const parts = [];
    for (const label of labels) {
        const len = Buffer.byteLength(label);
        parts.push(Buffer.from([len]));
        parts.push(Buffer.from(label, 'ascii'));
    }
    parts.push(Buffer.from([0])); // End of QNAME

    const qtypeBuf = Buffer.alloc(2);
    qtypeBuf.writeUInt16BE(qtype, 0);

    const qclassBuf = Buffer.alloc(2);
    qclassBuf.writeUInt16BE(qclass, 0);

    parts.push(qtypeBuf);
    parts.push(qclassBuf);
    return Buffer.concat(parts);
}