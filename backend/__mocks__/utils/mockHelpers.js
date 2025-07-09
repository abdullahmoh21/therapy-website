// Helper function to mock ObjectId without mongoose dependency
const mockId = () => "mock_id_" + Math.random().toString(36).substring(2, 10);

module.exports = {
  mockId,
};
