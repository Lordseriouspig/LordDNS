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

const buildHeader = require("./helpers/build_header");
const buildQuestion = require("./helpers/build_question");

const udpSocket = dgram.createSocket("udp4");
udpSocket.bind(2053, "127.0.0.1");

udpSocket.on("message", (buf, rinfo) => {
  try {
    let response

    // Build Header
    const headerFields = [1234,1,0,0,0,0,0,0,0,1,0,0,0] // transactionID, qr, opcode, aa, tc, rd, ra, z, rcode, qdcount, ancount, nscount, arcount
    response = buildHeader(headerFields)

    // Build Question
    const questionFields = ["codecrafters.io",1,1]
    const question = buildQuestion(questionFields); // Domain, QTYPE A, QCLASS IN
    response = Buffer.concat([response, question]);

    // Send Response
    udpSocket.send(response, rinfo.port, rinfo.address);

  } catch (e) {
    console.log(`Error receiving data: ${e}`);
  }
});

udpSocket.on("error", (err) => {
  console.log(`Error: ${err}`);
});

udpSocket.on("listening", () => {
  const address = udpSocket.address();
  console.log(`Server listening ${address.address}:${address.port}`);
});