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

module.exports = function buildResponse(transactionID,opcode,rd,responseRcode,qdcount,questions) {
    let response;
    try {
        // Build Header
        const headerFields = [transactionID,1,opcode,0,0,rd,0,0,responseRcode,qdcount,qdcount,0,0]; // transactionID, qr, opcode, aa, tc, rd, ra, z, rcode, qdcount, ancount, nscount, arcount
        response = buildHeader(headerFields);
    
        // Build Questions
        for (const q of questions) {
            const questionBuf = buildQuestion(q); // domainName, qtype, qclass
            response = Buffer.concat([response, questionBuf]);
        }
    
        if (responseRcode === 0) {
                // Build Answers
                for (const q of questions) {
                    const [domainName, qtype, qclass] = q;
            
                    if (qtype === 1) {
                        const answerFields = [domainName, qtype, qclass, 60, 4, Buffer.from([172,66,144,113])];
                        const answerBuf = buildAnswer(answerFields);
                        response = Buffer.concat([response, answerBuf]);
                    }
                }
        }
    } catch (error) {
        console.error('Error building response:', error);
        response = buildHeader([transactionID,1,opcode,0,0,rd,0,0,2,0,0,0,0]);
    } finally {
        return response;
    }
}