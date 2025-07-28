module.exports = {
  hash: jest
    .fn()
    .mockImplementation((str, salt) => Promise.resolve(`hashed_${str}`)),
  compare: jest
    .fn()
    .mockImplementation((str, hash) =>
      Promise.resolve(hash === `hashed_${str}`)
    ),
};
