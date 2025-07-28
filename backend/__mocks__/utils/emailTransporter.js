const transporter = {
  sendMail: jest.fn().mockResolvedValue({ messageId: "test-message-id" }),
};

module.exports = {
  transporter,
  createTransporter: jest.fn().mockReturnValue(transporter),
};
