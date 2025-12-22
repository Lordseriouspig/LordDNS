/**
 * DNS Server Integration Tests
 * 
 * Tests validate the actual behavior of the LordDNS server:
 * - Only supports standard queries (opcode 0)
 * - Only supports A record queries (qtype 1)
 * - Returns hardcoded IP 172.66.144.113
 * - Returns RCODE 4 (Not Implemented) for unsupported features
 */

const dgram = require('dgram');
const buildHeader = require('../app/helpers/build_header');
const buildQuestion = require('../app/helpers/build_question');
const parseHeader = require('../app/helpers/parse_header');
const parseQuestion = require('../app/helpers/parse_question');

// Helper to send DNS query and get response
function sendDNSQuery(query, timeout = 1000) {
  return new Promise((resolve, reject) => {
    const client = dgram.createSocket('udp4');
    
    const timer = setTimeout(() => {
      client.close();
      reject(new Error('Query timeout'));
    }, timeout);

    client.on('message', (msg) => {
      clearTimeout(timer);
      client.close();
      resolve(msg);
    });

    client.on('error', (err) => {
      clearTimeout(timer);
      client.close();
      reject(err);
    });

    client.send(query, 2053, '127.0.0.1');
  });
}

describe('LordDNS Server Integration Tests', () => {
  
  describe('Successful A Record Queries', () => {
    test('responds to simple A record query with hardcoded IP', async () => {
      const txID = Math.floor(Math.random() * 65535);
      const queryHeader = buildHeader([txID, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0]);
      const queryQuestion = buildQuestion(['example.com', 1, 1]);
      const query = Buffer.concat([queryHeader, queryQuestion]);

      const response = await sendDNSQuery(query);

      // Parse response header
      const [respTxID, qr, opcode, aa, tc, rd, ra, z, rcode, qdcount, ancount] = parseHeader(response);

      expect(respTxID).toBe(txID);
      expect(qr).toBe(1); // Response
      expect(opcode).toBe(0);
      expect(rcode).toBe(0); // No error
      expect(qdcount).toBe(1);
      expect(ancount).toBe(1);
      expect(aa).toBe(0); // Not authoritative
      expect(ra).toBe(0); // Recursion not available

      // Parse answer section - should return 172.66.144.113
      // Skip header (12) + question section
      let offset = 12;
      const { bytesRead } = parseQuestion(response, offset);
      offset += bytesRead;

      // Skip answer name/type/class/ttl
      const answerStart = offset;
      let i = offset;
      while (response[i] !== 0 && (response[i] & 0xC0) !== 0xC0) {
        const len = response[i];
        i += len + 1;
      }
      if ((response[i] & 0xC0) === 0xC0) i += 2;
      else i += 1;
      i += 2 + 2 + 4 + 2; // type + class + ttl + rdlength

      // Read IP address (last 4 bytes)
      const ip = Array.from(response.slice(i, i + 4));
      expect(ip).toEqual([172, 66, 144, 113]);
    }, 5000);

    test('preserves RD flag from query', async () => {
      const txID = Math.floor(Math.random() * 65535);
      
      // Query with RD=1
      const queryWithRD = Buffer.concat([
        buildHeader([txID, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0]),
        buildQuestion(['test.com', 1, 1])
      ]);
      const responseWithRD = await sendDNSQuery(queryWithRD);
      const [, , , , , rdResp1] = parseHeader(responseWithRD);
      expect(rdResp1).toBe(1);

      // Query with RD=0
      const queryWithoutRD = Buffer.concat([
        buildHeader([txID + 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0]),
        buildQuestion(['test.com', 1, 1])
      ]);
      const responseWithoutRD = await sendDNSQuery(queryWithoutRD);
      const [, , , , , rdResp2] = parseHeader(responseWithoutRD);
      expect(rdResp2).toBe(0);
    }, 5000);

    test('handles multiple questions correctly', async () => {
      const txID = Math.floor(Math.random() * 65535);
      const queryHeader = buildHeader([txID, 0, 0, 0, 0, 1, 0, 0, 0, 2, 0, 0, 0]);
      const question1 = buildQuestion(['example.com', 1, 1]);
      const question2 = buildQuestion(['test.com', 1, 1]);
      const query = Buffer.concat([queryHeader, question1, question2]);

      const response = await sendDNSQuery(query);
      const [respTxID, qr, , , , , , , rcode, qdcount, ancount] = parseHeader(response);

      expect(respTxID).toBe(txID);
      expect(qr).toBe(1);
      expect(rcode).toBe(0);
      expect(qdcount).toBe(2); // Questions echoed
      expect(ancount).toBe(2); // Answers provided
    }, 5000);
  });

  describe('Error Handling - RCODE 4 (Not Implemented)', () => {
    test('returns RCODE 4 for non-standard opcode', async () => {
      const txID = Math.floor(Math.random() * 65535);
      // Opcode 1 (IQUERY - inverse query)
      const queryHeader = buildHeader([txID, 0, 1, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0]);
      const queryQuestion = buildQuestion(['example.com', 1, 1]);
      const query = Buffer.concat([queryHeader, queryQuestion]);

      const response = await sendDNSQuery(query);
      const [respTxID, qr, opcode, , , rd, , , rcode, qdcount, ancount] = parseHeader(response);

      expect(respTxID).toBe(txID);
      expect(qr).toBe(1);
      expect(opcode).toBe(1); // Preserved from query
      expect(rd).toBe(1); // Preserved
      expect(rcode).toBe(4); // Not Implemented
      expect(qdcount).toBe(1); // Question echoed
      expect(ancount).toBe(0); // No answer
    }, 5000);

    test('returns RCODE 4 for non-A record query', async () => {
      const txID = Math.floor(Math.random() * 65535);
      // QTYPE 15 (MX record)
      const queryHeader = buildHeader([txID, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0]);
      const queryQuestion = buildQuestion(['example.com', 15, 1]);
      const query = Buffer.concat([queryHeader, queryQuestion]);

      const response = await sendDNSQuery(query);
      const [respTxID, qr, , , , , , , rcode, qdcount, ancount] = parseHeader(response);

      expect(respTxID).toBe(txID);
      expect(qr).toBe(1);
      expect(rcode).toBe(4); // Not Implemented
      expect(qdcount).toBe(1);
      expect(ancount).toBe(0);
    }, 5000);

    test('returns RCODE 4 for AAAA record query', async () => {
      const txID = Math.floor(Math.random() * 65535);
      // QTYPE 28 (AAAA - IPv6)
      const queryHeader = buildHeader([txID, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0]);
      const queryQuestion = buildQuestion(['example.com', 28, 1]);
      const query = Buffer.concat([queryHeader, queryQuestion]);

      const response = await sendDNSQuery(query);
      const [, , , , , , , , rcode, , ancount] = parseHeader(response);

      expect(rcode).toBe(4);
      expect(ancount).toBe(0);
    }, 5000);
  });

  describe('Server Flags and Behavior', () => {
    test('always sets QR=1 in responses', async () => {
      const txID = Math.floor(Math.random() * 65535);
      const query = Buffer.concat([
        buildHeader([txID, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0]),
        buildQuestion(['test.com', 1, 1])
      ]);

      const response = await sendDNSQuery(query);
      const [, qr] = parseHeader(response);
      expect(qr).toBe(1);
    }, 5000);

    test('always sets AA=0 (not authoritative)', async () => {
      const txID = Math.floor(Math.random() * 65535);
      const query = Buffer.concat([
        buildHeader([txID, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0]),
        buildQuestion(['test.com', 1, 1])
      ]);

      const response = await sendDNSQuery(query);
      const [, , , aa] = parseHeader(response);
      expect(aa).toBe(0);
    }, 5000);

    test('always sets TC=0 (not truncated)', async () => {
      const txID = Math.floor(Math.random() * 65535);
      const query = Buffer.concat([
        buildHeader([txID, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0]),
        buildQuestion(['test.com', 1, 1])
      ]);

      const response = await sendDNSQuery(query);
      const [, , , , tc] = parseHeader(response);
      expect(tc).toBe(0);
    }, 5000);

    test('always sets RA=0 (recursion not available)', async () => {
      const txID = Math.floor(Math.random() * 65535);
      const query = Buffer.concat([
        buildHeader([txID, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0]),
        buildQuestion(['test.com', 1, 1])
      ]);

      const response = await sendDNSQuery(query);
      const [, , , , , , ra] = parseHeader(response);
      expect(ra).toBe(0);
    }, 5000);

    test('always sets Z=0 (reserved bits)', async () => {
      const txID = Math.floor(Math.random() * 65535);
      const query = Buffer.concat([
        buildHeader([txID, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0]),
        buildQuestion(['test.com', 1, 1])
      ]);

      const response = await sendDNSQuery(query);
      const [, , , , , , , z] = parseHeader(response);
      expect(z).toBe(0);
    }, 5000);
  });

  describe('Question Section Echo', () => {
    test('echoes question section in response', async () => {
      const txID = Math.floor(Math.random() * 65535);
      const domain = 'mydomain.example.com';
      const queryHeader = buildHeader([txID, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0]);
      const queryQuestion = buildQuestion([domain, 1, 1]);
      const query = Buffer.concat([queryHeader, queryQuestion]);

      const response = await sendDNSQuery(query);

      // Parse question from response
      const { question } = parseQuestion(response, 12);
      const [domainName, qtype, qclass] = question;

      expect(domainName).toBe(domain);
      expect(qtype).toBe(1);
      expect(qclass).toBe(1);
    }, 5000);
  });

  describe('Answer Section', () => {
    test('answer TTL is 60 seconds', async () => {
      const txID = Math.floor(Math.random() * 65535);
      const query = Buffer.concat([
        buildHeader([txID, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0]),
        buildQuestion(['example.com', 1, 1])
      ]);

      const response = await sendDNSQuery(query);

      // Skip to TTL field in answer
      let offset = 12;
      const { bytesRead } = parseQuestion(response, offset);
      offset += bytesRead;

      // Skip name in answer (compression pointer: 2 bytes)
      offset += 2;
      // Skip type and class
      offset += 4;
      // Read TTL
      const ttl = response.readUInt32BE(offset);
      
      expect(ttl).toBe(60);
    }, 5000);

    test('answer RDLENGTH is 4 for A records', async () => {
      const txID = Math.floor(Math.random() * 65535);
      const query = Buffer.concat([
        buildHeader([txID, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0]),
        buildQuestion(['example.com', 1, 1])
      ]);

      const response = await sendDNSQuery(query);

      // Skip to RDLENGTH field
      let offset = 12;
      const { bytesRead } = parseQuestion(response, offset);
      offset += bytesRead;
      offset += 2 + 2 + 2 + 4; // name(compression) + type + class + ttl
      
      const rdlength = response.readUInt16BE(offset);
      expect(rdlength).toBe(4);
    }, 5000);
  });
});
