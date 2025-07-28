module.exports = {
  randomBytes: jest.fn().mockReturnValue({
    toString: jest.fn().mockReturnValue("random-bytes"),
  }),
  createHash: jest.fn().mockReturnValue({
    update: jest.fn().mockReturnThis(),
    digest: jest.fn().mockReturnValue("hashed-value"),
  }),
  createCipheriv: jest.fn().mockImplementation(() => ({
    update: jest.fn().mockReturnValue(Buffer.from("encrypted")),
    final: jest.fn().mockReturnValue(Buffer.from("final")),
  })),
  createDecipheriv: jest.fn().mockImplementation(() => ({
    update: jest.fn().mockReturnValue(Buffer.from("decrypted")),
    final: jest.fn().mockReturnValue(Buffer.from("final")),
  })),
};
