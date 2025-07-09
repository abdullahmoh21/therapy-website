// Mock external dependencies
const axios = {
  request: jest.fn().mockResolvedValue({ data: {} }),
};

const jsonwebtoken = {
  sign: jest.fn().mockReturnValue("mock-jwt-token"),
  verify: jest.fn().mockImplementation((token, secret) => {
    if (token === "valid-token") {
      return { userId: "userId123", jti: "valid-jti" };
    } else if (token === "invalid-user-token") {
      return { userId: "nonExistentUser", jti: "some-jti" };
    } else if (token === "invalid-jti-token") {
      return { userId: "userId123", jti: "invalid-jti" };
    } else {
      throw new Error("Invalid token");
    }
  }),
};

const bcrypt = {
  hash: jest
    .fn()
    .mockImplementation((str, salt) => Promise.resolve(`hashed_${str}`)),
  compare: jest
    .fn()
    .mockImplementation((str, hash) =>
      Promise.resolve(hash === `hashed_${str}`)
    ),
};

const crypto = {
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

module.exports = {
  axios,
  jsonwebtoken,
  bcrypt,
  crypto,
};
