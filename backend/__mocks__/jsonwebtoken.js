module.exports = {
  sign: jest.fn(function (payload, secret, options, callback) {
    const token = "mock-jwt-token";

    // If callback is provided as 4th argument, use callback style
    if (typeof callback === "function") {
      process.nextTick(() => callback(null, token));
      return;
    }

    // If options is actually a callback (3 args), use it
    if (typeof options === "function") {
      process.nextTick(() => options(null, token));
      return;
    }

    // Synchronous return for non-callback usage
    return token;
  }),
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
