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

module.exports = function parseQuestion(buf, offset) {
    const labels = [];
    let i = offset;

    while (true) {
        const len = buf[i];
        if (len === 0) {
            i += 1;
            break;
        }

        labels.push(buf.slice(i + 1, i + 1 + len).toString('ascii'));
        i += len + 1;
    }
    const domainName = labels.join('.');
    const bytesRead = i - offset;
    let curser = offset + bytesRead;

    const qtype = buf.readUInt16BE(curser);
    curser += 2;

    const qclass = buf.readUInt16BE(curser);
    curser += 2;

    return {
        question: [ domainName, qtype, qclass ],
        bytesRead: curser - offset
    }
}    