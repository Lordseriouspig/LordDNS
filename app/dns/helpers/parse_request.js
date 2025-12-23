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

const parseHeader = require("./parse_header");
const parseQuestion = require("./parse_question");

const buildHeader = require("./build_header");
const buildQuestion = require("./build_question");
const buildAnswer = require("./build_answer")

module.exports = function parseRequest(buf) {
    // Parse Header
    const header = parseHeader(buf);

    // Get required info from header
    const [ transactionID, qr, opcode, aa, tc, rd, ra, z, rcode, qdcount, ancount, nscount, arcount ] = header;

    // Parse Questions
    let offset = 12;
    const questions = [];
    for (let i = 0; i < qdcount; i++) {
        const { question, bytesRead } = parseQuestion(buf, offset);
        questions.push(question);
        offset += bytesRead;
    }

    return { header, questions, transactionID, qr, opcode, aa, tc, rd, ra, z, rcode, qdcount, ancount, nscount, arcount };
}