const Queue = jest.fn().mockImplementation(() => ({
  add: jest.fn().mockResolvedValue({ id: "job123" }),
}));

const Worker = jest.fn().mockImplementation(() => ({
  on: jest.fn(),
}));

module.exports = {
  Queue,
  Worker,
};
