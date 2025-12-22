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

const dgram = require("dgram");

const parseHeader = require("./helpers/parse_header");
const parseQuestion = require("./helpers/parse_question");

const buildHeader = require("./helpers/build_header");
const buildQuestion = require("./helpers/build_question");
const buildAnswer = require("./helpers/build_answer")

const udpSocket = dgram.createSocket("udp4");
udpSocket.bind(2053, "127.0.0.1");

udpSocket.on("message", (buf, rinfo) => {
  try {
    // Parse request
    console.log(`Received ${buf.length} bytes from ${rinfo.address}:${rinfo.port}`);
    console.log('Request Buffer:', buf.toString('hex'));


    // Parse Header
    const header = parseHeader(buf);

    // Get required info from header
    const [ transactionID, qr, opcode, aa, tc, rd, ra, z, rcode, qdcount, ancount, nscount, arcount ] = header;

    // Parse Question
    const { question, bytesRead } = parseQuestion(buf, 12);

    const [
        domainName,
        qtype,
        qclass
    ] = question;

    // Check some things
    let responseRcode;
    if (opcode !== 0) {
      console.log(`Unsupported opcode: ${opcode}`);
      responseRcode = 4;
    } else {
      responseRcode = 0;
    }
    if (qdcount !== 1) {
      console.log(`Questions is not 1: ${qdcount}`); // Only supports 1 question for now
      responseRcode = 1;
    }
    if (qtype !== 1) {
      console.log(`Unsupported QTYPE: ${qtype}`); // Only supports A records for now
      responseRcode = 4;
    }

    // Build Response
    let response;

    if (responseRcode === 0) {
      // Build Header
      const headerFields = [transactionID,1,opcode,0,0,rd,0,0,responseRcode,1,1,0,0]; // transactionID, qr, opcode, aa, tc, rd, ra, z, rcode, qdcount, ancount, nscount, arcount
      response = buildHeader(headerFields);

      // Build Question
      const questionFields = [domainName, qtype, qclass];
      const question = buildQuestion(questionFields); // Domain, QTYPE, QCLASS
      response = Buffer.concat([response, question]);

      // Build Answer
      const answerFields = [domainName,1,1,60,4,Buffer.from([172,66,144,113])]; // Domain, QTYPE, QCLASS, TTL, RDLENGTH, RDATA (IP)
      const answer = buildAnswer(answerFields);
      response = Buffer.concat([response, answer]);

      // Send Response
      udpSocket.send(response, rinfo.port, rinfo.address);
    } else {
      // Build Header
      const headerFields = [transactionID,1,opcode,0,0,rd,0,0,responseRcode,1,0,0,0]; // transactionID, qr, opcode, aa, tc, rd, ra, z, rcode, qdcount, ancount, nscount, arcount
      response = buildHeader(headerFields);

      // Build Question
      const questionFields = [domainName, qtype, qclass];
      const question = buildQuestion(questionFields); // Domain, QTYPE, QCLASS
      response = Buffer.concat([response, question]);

      // Send Response
      udpSocket.send(response, rinfo.port, rinfo.address);
    }

  } catch (e) {
    console.error(`Error receiving data: ${e}`);
  }
});

udpSocket.on("error", (err) => {
  console.error(`Error: ${err}`);
});

udpSocket.on("listening", () => {
  const address = udpSocket.address();
  console.log(`Server listening ${address.address}:${address.port}`);
});