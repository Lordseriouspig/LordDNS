const buildHeader = require('../app/helpers/build_header');
const buildQuestion = require('../app/helpers/build_question');
const buildAnswer = require('../app/helpers/build_answer');
const parseHeader = require('../app/helpers/parse_header');

// Common test data
const domain = 'codecrafters.io';
const qtype = 1;
const qclass = 1;
const ttl = 60;
const rdata = Buffer.from([172, 66, 144, 113]);

const expectedQuestionBuffer = Buffer.from([
  0x0c, 99, 111, 100, 101, 99, 114, 97, 102, 116, 101, 114, 115, // codecrafters
  0x02, 105, 111, // io
  0x00, // terminator
  0x00, 0x01, // QTYPE A
  0x00, 0x01, // QCLASS IN
]);

const expectedAnswerBuffer = Buffer.from([
  0x0c, 99, 111, 100, 101, 99, 114, 97, 102, 116, 101, 114, 115, // codecrafters
  0x02, 105, 111, // io
  0x00, // terminator
  0x00, 0x01, // TYPE A
  0x00, 0x01, // CLASS IN
  0x00, 0x00, 0x00, 0x3c, // TTL 60 seconds
  0x00, 0x04, // RDLENGTH
  172, 66, 144, 113, // RDATA (172.66.144.113)
]);

describe('build_header', () => {
  test('encodes flags and counts correctly', () => {
    const headerFields = [
      1234, // transactionID
      1,    // qr
      0,    // opcode
      0,    // aa
      0,    // tc
      0,    // rd
      0,    // ra
      0,    // z
      0,    // rcode
      1,    // qdcount
      1,    // ancount
      0,    // nscount
      0,    // arcount
    ];

    const buf = buildHeader(headerFields);
    const expected = Buffer.from([
      0x04, 0xd2, // transactionID = 1234
      0x80, 0x00, // flags (qr bit set)
      0x00, 0x01, // qdcount
      0x00, 0x01, // ancount
      0x00, 0x00, // nscount
      0x00, 0x00, // arcount
    ]);

    expect(buf).toEqual(expected);
  });
});

describe('build_question', () => {
  test('encodes QNAME, QTYPE and QCLASS', () => {
    const buf = buildQuestion([domain, qtype, qclass]);

    expect(buf).toEqual(expectedQuestionBuffer);
    expect(buf.length).toBe(21);
  });
});

describe('build_answer', () => {
  test('encodes NAME, TYPE, CLASS, TTL, RDLENGTH and RDATA', () => {
    const buf = buildAnswer([domain, qtype, qclass, ttl, rdata.length, rdata]);

    expect(buf).toEqual(expectedAnswerBuffer);
    expect(buf.length).toBe(31);
  });

  test('uses 32-bit TTL and provided RDLENGTH', () => {
    const customTtl = 300;
    const buf = buildAnswer([domain, qtype, qclass, customTtl, rdata.length, rdata]);

    const ttlOffset = expectedQuestionBuffer.length; // after name(17) + type(2) + class(2)
    const ttlFromBuf = buf.readUInt32BE(ttlOffset);
    expect(ttlFromBuf).toBe(customTtl);

    const rdlengthFromBuf = buf.readUInt16BE(ttlOffset + 4); // after ttl
    expect(rdlengthFromBuf).toBe(rdata.length);
  });
});

describe('parseHeader', () => {
  test('parses a valid DNS header', () => {
    const headerBuf = Buffer.from([
      0x04, 0xd2, // transactionID = 1234
      0x01, 0x00, // flags (rd bit set)
      0x00, 0x01, // qdcount = 1
      0x00, 0x00, // ancount = 0
      0x00, 0x00, // nscount = 0
      0x00, 0x00, // arcount = 0
    ]);

    const [transactionID, qr, opcode, aa, tc, rd, ra, z, rcode, qdcount, ancount, nscount, arcount] = parseHeader(headerBuf);

    expect(transactionID).toBe(1234);
    expect(qr).toBe(0);
    expect(opcode).toBe(0);
    expect(aa).toBe(0);
    expect(tc).toBe(0);
    expect(rd).toBe(1);
    expect(ra).toBe(0);
    expect(z).toBe(0);
    expect(rcode).toBe(0);
    expect(qdcount).toBe(1);
    expect(ancount).toBe(0);
    expect(nscount).toBe(0);
    expect(arcount).toBe(0);
  });

  test('parses response header with multiple flags set', () => {
    const headerBuf = Buffer.from([
      0xff, 0xff, // transactionID = 65535
      0x85, 0x80, // flags (qr=1, opcode=0, aa=1, tc=0, rd=1, ra=1, z=0, rcode=0)
      0x00, 0x02, // qdcount = 2
      0x00, 0x03, // ancount = 3
      0x00, 0x01, // nscount = 1
      0x00, 0x04, // arcount = 4
    ]);

    const [transactionID, qr, opcode, aa, tc, rd, ra, z, rcode, qdcount, ancount, nscount, arcount] = parseHeader(headerBuf);

    expect(transactionID).toBe(65535);
    expect(qr).toBe(1);
    expect(opcode).toBe(0);
    expect(aa).toBe(1);
    expect(tc).toBe(0);
    expect(rd).toBe(1);
    expect(ra).toBe(1);
    expect(z).toBe(0);
    expect(rcode).toBe(0);
    expect(qdcount).toBe(2);
    expect(ancount).toBe(3);
    expect(nscount).toBe(1);
    expect(arcount).toBe(4);
  });

  test('parses header with different opcode and rcode', () => {
    const headerBuf = Buffer.from([
      0x12, 0x34, // transactionID = 4660
      0x78, 0x03, // flags (opcode=15, rcode=3)
      0x00, 0x00,
      0x00, 0x00,
      0x00, 0x00,
      0x00, 0x00,
    ]);

    const [transactionID, qr, opcode, aa, tc, rd, ra, z, rcode] = parseHeader(headerBuf);

    expect(transactionID).toBe(4660);
    expect(opcode).toBe(15);
    expect(rcode).toBe(3);
  });

  test('throws error for buffer shorter than 12 bytes', () => {
    const shortBuf = Buffer.from([0x00, 0x01, 0x02]);

    expect(() => parseHeader(shortBuf)).toThrow('Buffer too short');
  });
});

describe('build_header + parseHeader round-trip', () => {
  test('builds and parses header correctly', () => {
    const headerFields = [
      5678, // transactionID
      1,    // qr
      4,    // opcode
      1,    // aa
      0,    // tc
      1,    // rd
      1,    // ra
      0,    // z
      2,    // rcode
      3,    // qdcount
      5,    // ancount
      2,    // nscount
      1,    // arcount
    ];

    const buf = buildHeader(headerFields);
    const [transactionID, qr, opcode, aa, tc, rd, ra, z, rcode, qdcount, ancount, nscount, arcount] = parseHeader(buf);

    expect(transactionID).toBe(5678);
    expect(qr).toBe(1);
    expect(opcode).toBe(4);
    expect(aa).toBe(1);
    expect(tc).toBe(0);
    expect(rd).toBe(1);
    expect(ra).toBe(1);
    expect(z).toBe(0);
    expect(rcode).toBe(2);
    expect(qdcount).toBe(3);
    expect(ancount).toBe(5);
    expect(nscount).toBe(2);
    expect(arcount).toBe(1);
  });
});

describe('buildQuestion edge cases', () => {
  test('handles single label domain', () => {
    const buf = buildQuestion(['localhost', 1, 1]);

    expect(buf[0]).toBe(9); // length of 'localhost'
    expect(buf.toString('ascii', 1, 10)).toBe('localhost');
    expect(buf[10]).toBe(0); // terminator
  });

  test('handles multi-label domain with long labels', () => {
    const buf = buildQuestion(['verylongsubdomain.example.com', 1, 1]);

    expect(buf[0]).toBe(17); // length of 'verylongsubdomain'
    expect(buf[18]).toBe(7); // length of 'example'
    expect(buf[26]).toBe(3); // length of 'com'
  });

  test('encodes different QTYPE values', () => {
    const buf = buildQuestion(['example.com', 15, 1]); // MX record type

    const qtypeOffset = 'example.com'.split('.').reduce((acc, label) => acc + 1 + label.length, 0) + 1;
    const qtype = buf.readUInt16BE(qtypeOffset);
    expect(qtype).toBe(15);
  });
});

describe('buildAnswer edge cases', () => {
  test('handles different IP addresses', () => {
    const testIP = Buffer.from([8, 8, 8, 8]); // 8.8.8.8
    const buf = buildAnswer(['dns.google', 1, 1, 86400, testIP.length, testIP]);

    const rdataOffset = buf.length - testIP.length;
    expect(buf.slice(rdataOffset)).toEqual(testIP);
  });

  test('handles maximum TTL value', () => {
    const maxTtl = 2147483647; // 2^31 - 1
    const buf = buildAnswer(['example.com', 1, 1, maxTtl, rdata.length, rdata]);

    // Find TTL position after name (example.com = 13 bytes) + type (2) + class (2)
    const ttlOffset = 17;
    const ttlValue = buf.readUInt32BE(ttlOffset);
    expect(ttlValue).toBe(maxTtl);
  });
});

describe('DNS Request/Response Integration', () => {
  test('simulates complete DNS query/response flow', () => {
    // Simulate incoming DNS query
    const queryHeader = buildHeader([9876, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0]);
    const queryQuestion = buildQuestion(['example.com', 1, 1]);
    const queryPacket = Buffer.concat([queryHeader, queryQuestion]);

    // Parse the query
    const [transactionID, qr, opcode, aa, tc, rd] = parseHeader(queryPacket);

    expect(transactionID).toBe(9876);
    expect(qr).toBe(0); // Query
    expect(rd).toBe(1); // Recursion desired

    // Build response using parsed values (server always returns 172.66.144.113)
    const responseHeader = buildHeader([transactionID, 1, opcode, 0, 0, rd, 0, 0, 0, 1, 1, 0, 0]);
    const responseQuestion = buildQuestion(['example.com', 1, 1]);
    const responseAnswer = buildAnswer(['example.com', 1, 1, 60, 4, Buffer.from([172, 66, 144, 113])]);
    const responsePacket = Buffer.concat([responseHeader, responseQuestion, responseAnswer]);

    // Parse the response to verify
    const [respTxID, respQR] = parseHeader(responsePacket);

    expect(respTxID).toBe(transactionID); // Transaction IDs match
    expect(respQR).toBe(1); // Response
  });
});
