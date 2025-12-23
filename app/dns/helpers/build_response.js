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

const { getRecords, domainExists } = require("../../db/index");

const TYPE_HANDLERS = require("./type_mappings");
const {
    FORMERR,
    SRVFAIL,
    NXDOMAIN,
    NOTIMP,
    REFUSED,
    YXDOMAIN,
    YXRRSET,
    NXRRSET,
    NOTAUTH,
    NOTZONE,
} = require("./error_classes");

function buildResponse(transactionID,opcode,rd,qdcount,questions) {
    let response;
    let questionBuffers = [];
    let answerBuffers = [];
    let ancount = 0;
    // Build Questions
    for (const q of questions) {
        const questionBuf = buildQuestion(q); // domainName, qtype, qclass
        questionBuffers.push(questionBuf);
    }
    // Build Answers
    for (const q of questions) {
        const [domainName, qtype, qclass] = q;
        const records = getRecords(domainName, qtype);
        if (records.length === 0) {
            if (!domainExists(domainName)) {
                throw new NXDOMAIN(`No record found for ${domainName} type ${qtype}`);
            }
            continue;
        }

        const handler = TYPE_HANDLERS[qtype];
        if (!handler) {
            throw new NOTIMP(`No handler for QTYPE: ${qtype}`);
        }
        for (const record of records) {
            const rdata = handler.format(record.value);
            const answerFields = [domainName, qtype, qclass, record.ttl, rdata.length, rdata];
            answerBuffers.push(buildAnswer(answerFields));
            ancount++;
        }
    }
    const headerFields = [transactionID,1,opcode,0,0,rd,0,0,0,qdcount,ancount,0,0];
    const header = buildHeader(headerFields);

    response = Buffer.concat([header, ...questionBuffers, ...answerBuffers]);
    return { response, ancount, questionBuffers, answerBuffers };
}
function buildErrorResponse(transactionID,opcode,rd,responseRcode,qdcount,questions) {
    let response;
    let questionBuffers = [];

    for (const q of questions) {
        const questionBuf = buildQuestion(q); // domainName, qtype, qclass
        questionBuffers.push(questionBuf);
    }

    const headerFields = [transactionID,1,opcode,0,0,rd,0,0,responseRcode,qdcount,0,0,0];
    const header = buildHeader(headerFields);

    response = Buffer.concat([header, ...questionBuffers]);
    return response;
}
module.exports = { buildResponse, buildErrorResponse };