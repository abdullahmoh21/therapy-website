const { setupAdminApp, setupDatabase, mongoose } = require("../../testSetup");
const request = require("supertest");
const adminController = require("../../../../controllers/adminController");

describe("System Health Endpoint", () => {
  const app = setupAdminApp();
  const { connectDB, closeDB, clearCollections } = setupDatabase();

  beforeAll(async () => {
    await connectDB();
  });

  afterAll(async () => {
    await closeDB();
  });

  beforeEach(async () => {
    await clearCollections();
  });

  describe("GET /admin/system-health", () => {
    it("should return system health data", async () => {
      const response = await request(app).get("/admin/system-health");

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("server");
      expect(response.body).toHaveProperty("cpu");
      expect(response.body).toHaveProperty("redis");
      expect(response.body).toHaveProperty("memory");
      expect(response.body).toHaveProperty("database");

      // Verify server info
      expect(response.body.server).toHaveProperty("status", "Running");
      expect(response.body.server).toHaveProperty("uptime");
      expect(response.body.server).toHaveProperty("nodeVersion");
      expect(response.body.server).toHaveProperty("platform");
      expect(response.body.server).toHaveProperty("hostname");

      // Verify CPU info
      expect(response.body.cpu).toHaveProperty("count");
      expect(response.body.cpu).toHaveProperty("model");
      expect(response.body.cpu).toHaveProperty("load1");

      // Verify memory info
      expect(response.body.memory).toHaveProperty("rssMB");
      expect(response.body.memory).toHaveProperty("heapTotalMB");
      expect(response.body.memory).toHaveProperty("heapUsedMB");

      // Verify database info
      expect(response.body.database).toHaveProperty("status");
    });
  });
});
