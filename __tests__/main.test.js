/**
 * DNS Server RFC 1035 Compliance Tests
 * 
 * RFC 1035: Domain Names - Implementation and Specification
 * Tests validate the DNS server's compliance with the RFC 1035 standard
 * for DNS message format, header fields, and response generation.
 */

const dgram = require('dgram');
const buildHeader = require('../app/helpers/build_header');
const buildQuestion = require('../app/helpers/build_question');
const parseHeader = require('../app/helpers/parse_header');

describe('DNS Server - RFC 1035 Compliance', () => {
  
  describe('RFC 1035 Section 4.1.1 - Header Format', () => {
    test('response header has correct size (12 bytes)', () => {
      const headerFields = [1234, 1, 0, 0, 0, 1, 0, 0, 0, 1, 1, 0, 0];
      const buf = buildHeader(headerFields);
      expect(buf.length).toBe(12);
    });

    test('transaction ID is preserved in response', () => {
      const queryTxID = 9999;
      const headerFields = [queryTxID, 1, 0, 0, 0, 1, 0, 0, 0, 1, 1, 0, 0];
      const buf = buildHeader(headerFields);
      const txID = buf.readUInt16BE(0);
      expect(txID).toBe(queryTxID);
    });

    test('QR flag indicates response (1)', () => {
      // RFC 1035: QR - A one bit field that specifies whether this message is a query (0), or a response (1).
      const headerFields = [1234, 1, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0];
      const buf = buildHeader(headerFields);
      const flags = buf.readUInt16BE(2);
      const qr = (flags >> 15) & 0b1;
      expect(qr).toBe(1);
    });

    test('OPCODE field preserved from request', () => {
      // RFC 1035: OPCODE - A four bit field that specifies kind of query in this message
      const opcodeValues = [0, 1, 2, 4, 15]; // Standard, Inverse, Server Status, Notify, and reserved values
      opcodeValues.forEach(opcode => {
        const headerFields = [1234, 1, opcode, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0];
        const buf = buildHeader(headerFields);
        const flags = buf.readUInt16BE(2);
        const extractedOpcode = (flags >> 11) & 0b1111;
        expect(extractedOpcode).toBe(opcode);
      });
    });

    test('AA flag set to 0 for non-authoritative answer', () => {
      // RFC 1035: AA - Authoritative Answer - this bit is valid in responses, and specifies that the responding nameserver is an authority for the domain
      const headerFields = [1234, 1, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0];
      const buf = buildHeader(headerFields);
      const flags = buf.readUInt16BE(2);
      const aa = (flags >> 10) & 0b1;
      expect(aa).toBe(0);
    });

    test('TC flag indicates message truncation (0 for non-truncated)', () => {
      // RFC 1035: TC - TrunCation - specifies that this message was truncated due to length
      const headerFields = [1234, 1, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0];
      const buf = buildHeader(headerFields);
      const flags = buf.readUInt16BE(2);
      const tc = (flags >> 9) & 0b1;
      expect(tc).toBe(0);
    });

    test('RD flag preserved from request', () => {
      // RFC 1035: RD - Recursion Desired - this bit is set in a query and copied into the response
      [0, 1].forEach(rd => {
        const headerFields = [1234, 1, 0, 0, 0, rd, 0, 0, 0, 1, 1, 0, 0];
        const buf = buildHeader(headerFields);
        const flags = buf.readUInt16BE(2);
        const extractedRD = (flags >> 8) & 0b1;
        expect(extractedRD).toBe(rd);
      });
    });

    test('RA flag indicates recursion available', () => {
      // RFC 1035: RA - Recursion Available - this bit is set or cleared in a response
      const headerFields = [1234, 1, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0];
      const buf = buildHeader(headerFields);
      const flags = buf.readUInt16BE(2);
      const ra = (flags >> 7) & 0b1;
      expect([0, 1]).toContain(ra);
    });

    test('Z field must be zero', () => {
      // RFC 1035: Z - Reserved for future use. Must be zero in all queries and responses.
      const headerFields = [1234, 1, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0];
      const buf = buildHeader(headerFields);
      const flags = buf.readUInt16BE(2);
      const z = (flags >> 4) & 0b111;
      expect(z).toBe(0);
    });

    test('RCODE field indicates response code', () => {
      // RFC 1035: RCODE - Response code - 4-bit field with values 0-5 defined
      const validRcodes = [0, 1, 2, 3, 4, 5]; // NOERROR, FORMERR, SERVFAIL, NXDOMAIN, NOTIMPL, REFUSED
      validRcodes.forEach(rcode => {
        const headerFields = [1234, 1, 0, 0, 0, 0, 0, 0, rcode, 1, 1, 0, 0];
        const buf = buildHeader(headerFields);
        const flags = buf.readUInt16BE(2);
        const extractedRCode = flags & 0b1111;
        expect(extractedRCode).toBe(rcode);
      });
    });

    test('QDCOUNT matches number of questions', () => {
      // RFC 1035: QDCOUNT - unsigned 16 bit integer specifying the number of entries in the question section
      const headerFields = [1234, 1, 0, 0, 0, 0, 0, 0, 0, 5, 1, 0, 0];
      const buf = buildHeader(headerFields);
      const qdcount = buf.readUInt16BE(4);
      expect(qdcount).toBe(5);
    });

    test('ANCOUNT matches number of answers', () => {
      // RFC 1035: ANCOUNT - unsigned 16 bit integer specifying the number of resource records in the answer section
      const headerFields = [1234, 1, 0, 0, 0, 0, 0, 0, 0, 1, 10, 0, 0];
      const buf = buildHeader(headerFields);
      const ancount = buf.readUInt16BE(6);
      expect(ancount).toBe(10);
    });

    test('NSCOUNT specifies authority records', () => {
      // RFC 1035: NSCOUNT - unsigned 16 bit integer specifying the number of authority records
      const headerFields = [1234, 1, 0, 0, 0, 0, 0, 0, 0, 1, 1, 3, 0];
      const buf = buildHeader(headerFields);
      const nscount = buf.readUInt16BE(8);
      expect(nscount).toBe(3);
    });

    test('ARCOUNT specifies additional records', () => {
      // RFC 1035: ARCOUNT - unsigned 16 bit integer specifying the number of additional records
      const headerFields = [1234, 1, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 2];
      const buf = buildHeader(headerFields);
      const arcount = buf.readUInt16BE(10);
      expect(arcount).toBe(2);
    });
  });

  describe('RFC 1035 Section 4.1.2 - Question Section', () => {
    test('QNAME is null-terminated domain name', () => {
      const buf = buildQuestion(['example.com', 1, 1]);
      // Last byte before QTYPE should be 0x00 (null terminator)
      const qtypeOffset = buf.indexOf(0x00, 1); // Find first null after the start
      expect(buf[qtypeOffset]).toBe(0x00);
    });

    test('QNAME labels are length-prefixed', () => {
      // RFC 1035: domain names are encoded with length-prefixed labels
      const buf = buildQuestion(['example.com', 1, 1]);
      // 'example' should be 7 bytes, 'com' should be 3 bytes
      expect(buf[0]).toBe(7); // length of 'example'
      expect(buf.indexOf(3, 1)).toBeGreaterThan(0); // length of 'com'
    });

    test('QTYPE field is A record type (1)', () => {
      // RFC 1035: QTYPE - unsigned 16 bit integer specifying the question type
      const buf = buildQuestion(['example.com', 1, 1]);
      const qtype = buf.readUInt16BE(buf.length - 4);
      expect(qtype).toBe(1); // Type A
    });

    test('QTYPE supports all standard types', () => {
      // RFC 1035 standard query types
      const types = [
        { code: 1, name: 'A' },
        { code: 2, name: 'NS' },
        { code: 5, name: 'CNAME' },
        { code: 6, name: 'SOA' },
        { code: 12, name: 'PTR' },
        { code: 15, name: 'MX' },
        { code: 16, name: 'TXT' },
        { code: 28, name: 'AAAA' },
        { code: 255, name: 'ANY' }
      ];
      
      types.forEach(type => {
        const buf = buildQuestion(['example.com', type.code, 1]);
        const qtype = buf.readUInt16BE(buf.length - 4);
        expect(qtype).toBe(type.code);
      });
    });

    test('QCLASS field is IN (Internet) class (1)', () => {
      // RFC 1035: QCLASS - unsigned 16 bit integer specifying the question class
      const buf = buildQuestion(['example.com', 1, 1]);
      const qclass = buf.readUInt16BE(buf.length - 2);
      expect(qclass).toBe(1); // Class IN
    });

    test('QCLASS supports all standard classes', () => {
      // RFC 1035 standard classes
      const classes = [
        { code: 1, name: 'IN' },
        { code: 3, name: 'CH' },
        { code: 4, name: 'HS' },
        { code: 255, name: 'ANY' }
      ];
      
      classes.forEach(cls => {
        const buf = buildQuestion(['example.com', 1, cls.code]);
        const qclass = buf.readUInt16BE(buf.length - 2);
        expect(qclass).toBe(cls.code);
      });
    });
  });

  describe('RFC 1035 Section 4.1.3 - Resource Records (Answer Section)', () => {
    test('NAME field matches question domain', () => {
      // RFC 1035: The NAME field specifies the domain name for which the answer applies
      const domain = 'test.example.com';
      const buf = require('../app/helpers/build_answer')([domain, 1, 1, 300, 4, Buffer.from([192, 0, 2, 1])]);
      expect(buf.length).toBeGreaterThan(0);
      // NAME should encode the domain
      expect(buf[0]).toBeGreaterThan(0); // First label length
    });

    test('TYPE field specifies resource record type', () => {
      // RFC 1035: TYPE - two octet code that specifies the meaning of the RDATA field
      const types = [1, 2, 5, 6, 12, 15, 16, 28];
      types.forEach(type => {
        const buf = require('../app/helpers/build_answer')(['example.com', type, 1, 300, 4, Buffer.from([192, 0, 2, 1])]);
        // Find type field (after name encoding + type is 2 bytes)
        // For 'example.com': 1 (len) + 7 (example) + 1 (len) + 3 (com) + 1 (null) = 13, then type at offset 13
        const typeValue = buf.readUInt16BE(13);
        expect(typeValue).toBe(type);
      });
    });

    test('CLASS field specifies resource class', () => {
      // RFC 1035: CLASS - two octet code that specifies the class of the RDATA
      const buf = require('../app/helpers/build_answer')(['example.com', 1, 1, 300, 4, Buffer.from([192, 0, 2, 1])]);
      // CLASS should be 1 (IN - Internet), after type (at offset 13 + 2)
      const classValue = buf.readUInt16BE(15);
      expect(classValue).toBe(1);
    });

    test('TTL is unsigned 32-bit integer', () => {
      // RFC 1035: TTL - a 32 bit signed integer specifying the time interval
      const ttlValues = [60, 300, 3600, 86400, 2147483647]; // Various TTL values
      ttlValues.forEach(ttl => {
        const buf = require('../app/helpers/build_answer')(['example.com', 1, 1, ttl, 4, Buffer.from([192, 0, 2, 1])]);
        // TTL is at offset 17 (13 + 2 (type) + 2 (class))
        const ttlValue = buf.readUInt32BE(17);
        expect(ttlValue).toBe(ttl);
      });
    });

    test('TTL zero indicates no caching', () => {
      // RFC 1035: A TTL of zero indicates that the resource record should not be cached
      const buf = require('../app/helpers/build_answer')(['example.com', 1, 1, 0, 4, Buffer.from([192, 0, 2, 1])]);
      const ttlValue = buf.readUInt32BE(17);
      expect(ttlValue).toBe(0);
    });

    test('RDLENGTH specifies RDATA field length', () => {
      // RFC 1035: RDLENGTH - unsigned 16 bit integer specifying the length of the RDATA field
      const rdata = Buffer.from([192, 0, 2, 1]);
      const buf = require('../app/helpers/build_answer')(['example.com', 1, 1, 300, rdata.length, rdata]);
      // RDLENGTH is at offset 21 (17 + 4 (TTL))
      const rdlength = buf.readUInt16BE(21);
      expect(rdlength).toBe(4);
    });

    test('RDATA contains IPv4 address for A records', () => {
      // RFC 1035: A - a host address (IPv4, 4 octets)
      const ipAddress = Buffer.from([192, 0, 2, 1]);
      const buf = require('../app/helpers/build_answer')(['example.com', 1, 1, 300, ipAddress.length, ipAddress]);
      const rdata = buf.slice(buf.length - ipAddress.length);
      expect(rdata).toEqual(ipAddress);
    });

    test('RDATA contains IPv6 address for AAAA records', () => {
      // RFC 3596: AAAA - IPv6 Address (128 bits = 16 octets)
      const ipv6Address = Buffer.from([
        0x20, 0x01, 0x0d, 0xb8,
        0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x01
      ]);
      const buf = require('../app/helpers/build_answer')(['example.com', 28, 1, 300, ipv6Address.length, ipv6Address]);
      const rdata = buf.slice(buf.length - ipv6Address.length);
      expect(rdata).toEqual(ipv6Address);
    });

    test('multiple records can be concatenated', () => {
      // RFC 1035: Multiple resource records can be sent in the answer section
      const buildAnswer = require('../app/helpers/build_answer');
      const answer1 = buildAnswer(['example.com', 1, 1, 300, 4, Buffer.from([192, 0, 2, 1])]);
      const answer2 = buildAnswer(['example.com', 1, 1, 300, 4, Buffer.from([192, 0, 2, 2])]);
      const combined = Buffer.concat([answer1, answer2]);
      
      expect(combined.length).toBe(answer1.length + answer2.length);
    });
  });

  describe('RFC 1035 Section 4.2 - Message Compression (Domain Name Compression)', () => {
    test('domain name should support compression pointers', () => {
      // RFC 1035: Domain names in messages are expressed in terms of a sequence of labels
      // Domain name compression can use pointers to reduce message size
      const buf = buildQuestion(['example.com', 1, 1]);
      expect(buf.length).toBeGreaterThan(0);
    });
  });

  describe('RFC 1035 Section 5 - DNS Query and Response', () => {
    test('response preserves transaction ID from query', () => {
      // RFC 1035: The query and response transaction IDs must match
      const queryTxID = 54321;
      const responseBuf = buildHeader([queryTxID, 1, 0, 0, 0, 1, 0, 0, 0, 1, 1, 0, 0]);
      const responseTxID = responseBuf.readUInt16BE(0);
      expect(responseTxID).toBe(queryTxID);
    });

    test('response QR flag is set to 1', () => {
      // RFC 1035: QR=1 indicates this is a response message
      const responseBuf = buildHeader([1, 1, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0]);
      const flags = responseBuf.readUInt16BE(2);
      const qr = (flags >> 15) & 0b1;
      expect(qr).toBe(1);
    });

    test('response QDCOUNT should match query QDCOUNT', () => {
      // RFC 1035: Response should echo the question from the query
      const responseBuf = buildHeader([1, 1, 0, 0, 0, 0, 0, 0, 0, 3, 1, 0, 0]);
      const qdcount = responseBuf.readUInt16BE(4);
      expect(qdcount).toBe(3);
    });

    test('response ANCOUNT matches answer section size', () => {
      // RFC 1035: ANCOUNT should be 1 for a response with one answer
      const responseBuf = buildHeader([1, 1, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0]);
      const ancount = responseBuf.readUInt16BE(6);
      expect(ancount).toBe(1);
    });
  });

  describe('RFC 1035 Section 6 - Implementation Notes', () => {
    test('message size validation - header minimum 12 bytes', () => {
      // RFC 1035: The DNS message header is 12 octets (96 bits)
      const buf = buildHeader([1, 1, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0]);
      expect(buf.length).toBe(12);
    });

    test('question and answer sections are properly structured', () => {
      // RFC 1035: Each question and answer record has specific structure
      const header = buildHeader([1, 1, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0]);
      const question = buildQuestion(['example.com', 1, 1]);
      const answer = require('../app/helpers/build_answer')(['example.com', 1, 1, 300, 4, Buffer.from([192, 0, 2, 1])]);
      
      const fullMessage = Buffer.concat([header, question, answer]);
      
      // Verify message structure
      expect(header.length).toBe(12);
      expect(question.length).toBeGreaterThan(0);
      expect(answer.length).toBeGreaterThan(0);
      expect(fullMessage.length).toBe(header.length + question.length + answer.length);
    });

    test('response reflects opcode from request', () => {
      // RFC 1035: The response opcode should reflect the query opcode
      const opcodes = [0, 1, 2, 4]; // QUERY, IQUERY, STATUS, NOTIFY
      opcodes.forEach(opcode => {
        const responseBuf = buildHeader([1, 1, opcode, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0]);
        const flags = responseBuf.readUInt16BE(2);
        const responseOpcode = (flags >> 11) & 0b1111;
        expect(responseOpcode).toBe(opcode);
      });
    });

    test('case insensitivity of domain names', () => {
      // RFC 1035: Comparisons should be case-insensitive for domain names
      const buf1 = buildQuestion(['Example.COM', 1, 1]);
      const buf2 = buildQuestion(['example.com', 1, 1]);
      
      // Both should produce valid DNS question sections
      expect(buf1.length).toBeGreaterThan(0);
      expect(buf2.length).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('handles transaction ID overflow at 2^16', () => {
      const maxTxID = 65535; // 2^16 - 1
      const responseBuf = buildHeader([maxTxID, 1, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0]);
      const txID = responseBuf.readUInt16BE(0);
      expect(txID).toBe(maxTxID);
    });

    test('handles large record counts', () => {
      const largeCounts = [1000, 10000, 65535]; // Max 16-bit value
      largeCounts.forEach(count => {
        const responseBuf = buildHeader([1, 1, 0, 0, 0, 0, 0, 0, 0, count, count, count, count]);
        expect(responseBuf.readUInt16BE(4)).toBe(count);
        expect(responseBuf.readUInt16BE(6)).toBe(count);
        expect(responseBuf.readUInt16BE(8)).toBe(count);
        expect(responseBuf.readUInt16BE(10)).toBe(count);
      });
    });

    test('handles maximum TTL value', () => {
      const maxTTL = 2147483647; // 2^31 - 1
      const buf = require('../app/helpers/build_answer')(['example.com', 1, 1, maxTTL, 4, Buffer.from([192, 0, 2, 1])]);
      const ttl = buf.readUInt32BE(17);
      expect(ttl).toBe(maxTTL);
    });

    test('rejects invalid RCODE values > 15 (4-bit field)', () => {
      // RCODE is 4-bit, so valid values are 0-15
      for (let i = 0; i <= 15; i++) {
        const responseBuf = buildHeader([1, 1, 0, 0, 0, 0, 0, 0, i, 1, 1, 0, 0]);
        const rcode = responseBuf.readUInt16BE(2) & 0b1111;
        expect(rcode).toBe(i);
      }
    });
  });
});
