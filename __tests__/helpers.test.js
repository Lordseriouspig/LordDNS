const buildHeader = require('../app/helpers/build_header');
const buildQuestion = require('../app/helpers/build_question');
const buildAnswer = require('../app/helpers/build_answer');

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
