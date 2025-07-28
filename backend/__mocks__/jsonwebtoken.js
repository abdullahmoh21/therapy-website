module.exports = {
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
