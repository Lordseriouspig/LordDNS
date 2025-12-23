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
const { buildResponse, buildErrorResponse } = require("./helpers/build_response");
const buildHeader = require("./helpers/build_header");

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
} = require("./helpers/error_classes");

let transactionID, opcode, rd, qdcount;

module.exports = function startDNS(port = 53, host = "127.0.0.1") {
  const udpSocket = dgram.createSocket("udp4");
  udpSocket.bind(port, host);
  
  udpSocket.on("message", (buf, rinfo) => {
    try {
      // Parse request
      console.log('--');
      console.log(`[DNS] Received ${buf.length} bytes from ${rinfo.address}:${rinfo.port}`);
  
      ({ header, questions, transactionID, qr, opcode, aa, tc, rd, ra, z, rcode, qdcount, ancount, nscount, arcount } = parseRequest(buf));
      console.log(`[DNS][Request] Transaction ID: ${transactionID}, Questions: ${qdcount}. Requesting ${questions.toString()}`);
      console.debug('[DNS][Request] Request Buffer:', buf.toString('hex'));

  
      // Check some things
      if (opcode !== 0) {
        throw new NOTIMP(`Unsupported opcode: ${opcode}`);
      }
  
      // Build Response
      const { response, ancount: responseAncount, questionBuffers, answerBuffers } = buildResponse(transactionID,opcode,rd,qdcount,questions);
      console.log(`[DNS][Response] Transaction ID: ${transactionID}, Rcode: 0, Questions: ${qdcount}, ${questionBuffers} Answers: ${responseAncount}, ${answerBuffers}`);
  
      // Send Response
      console.debug('[DNS][Response] Response Buffer:', response.toString('hex'));
      udpSocket.send(response, rinfo.port, rinfo.address);
  
    } catch (e) {
      if (e instanceof FORMERR || e instanceof SRVFAIL || e instanceof NXDOMAIN || e instanceof NOTIMP || e instanceof REFUSED || e instanceof YXDOMAIN || e instanceof YXRRSET || e instanceof NXRRSET || e instanceof NOTAUTH || e instanceof NOTZONE) {
        console.log(`[DNS] ${e.message}`);
        try {
          const response = buildErrorResponse(transactionID,opcode,rd,e.rcode,qdcount,questions);
          console.log(`[DNS][Response] Transaction ID: ${transactionID}, Rcode: ${e.rcode}`);
          console.debug('[DNS][Response] Response Buffer:', response.toString('hex'));
          udpSocket.send(response, rinfo.port, rinfo.address);
        } catch (e) {
          console.error(`[DNS][Response] Failed to send error response: ${e}\n${e.stack}`);
        }
      } else {
        console.error(`[DNS] Unexpected error occurred: ${e}\n${e.stack}`);
        try {
          const response = buildErrorResponse(transactionID,opcode,rd,2,qdcount,questions);
          console.log(`[DNS][Response] Transaction ID: ${transactionID}, Rcode: 2`);
          console.debug('[DNS][Response] Response Buffer:', response.toString('hex'));
          udpSocket.send(response, rinfo.port, rinfo.address);
        } catch (e) { // something seriously fucked up...
          console.error(`[DNS][Response] Failed to send error response: ${e}\n${e.stack}`);
        }
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
}