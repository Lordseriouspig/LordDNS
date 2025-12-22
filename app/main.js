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

const parseRequest = require("./helpers/parse_request");
const buildResponse = require("./helpers/build_response");
const buildHeader = require("./helpers/build_header");

let transactionID, opcode, rd;

const udpSocket = dgram.createSocket("udp4");
udpSocket.bind(53, "127.0.0.1");

udpSocket.on("message", (buf, rinfo) => {
  try {
    // Parse request
    console.log('--');
    console.log(`Received ${buf.length} bytes from ${rinfo.address}:${rinfo.port}`);
    console.log('Request Buffer:', buf.toString('hex'));

    ({ header, questions, transactionID, qr, opcode, aa, tc, rd, ra, z, rcode, qdcount, ancount, nscount, arcount } = parseRequest(buf));

    // Check some things
    let responseRcode = 0;
    if (opcode !== 0) {
      console.warn(`Unsupported opcode: ${opcode}`);
      responseRcode = 4;
    } else {
      responseRcode = 0;
    }
    for (const [domainName, qtype, qclass] of questions) {
        if (qtype !== 1) {
            console.warn(`Unsupported QTYPE: ${qtype}`);
            responseRcode = 4;
            break;
        }
    }

    // Build Response
    const response = buildResponse(transactionID,opcode,rd,responseRcode,qdcount,questions);

    // Send Response
    console.log('Response Buffer:', response.toString('hex'));
    udpSocket.send(response, rinfo.port, rinfo.address);

  } catch (e) {
    console.error(`Error handling request: ${e}\n${e.stack}`);
    try {
      udpSocket.send(buildHeader([transactionID,1,opcode,0,0,rd,0,0,2,0,0,0,0]), rinfo.port, rinfo.address);
    } catch (e) { // something seriously fucked up...
      console.error(`Also failed to send error response: ${e}\n${e.stack}`);
    }
  }
});

udpSocket.on("error", (err) => {
  console.error(`Error: ${err}\n${err.stack}`);
});

udpSocket.on("listening", () => {
  const address = udpSocket.address();
  console.log(`Server listening ${address.address}:${address.port}`);
});