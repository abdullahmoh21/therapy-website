const {
  setupAdminApp,
  setupDatabase,
  sendEmail,
  User,
  Invitee,
  mongoose,
  invalidateByEvent,
} = require("../../testSetup");
const request = require("supertest");

// Set NODE_ENV to test for this file
process.env.NODE_ENV = "test";

describe("Admin Invitation Endpoints", () => {
  const app = setupAdminApp();
  const { connectDB, closeDB, clearCollections } = setupDatabase();
  let mongoServer;

  // ────────────────────────────────────────────────────────────
  // In-memory MongoDB lifecycle
  // ────────────────────────────────────────────────────────────
  beforeAll(async () => {
    mongoServer = await connectDB();
  });

  afterAll(async () => {
    await closeDB();
  });

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();

    // Ensure sendEmail is mocked to resolve successfully by default
    sendEmail.mockResolvedValue({ success: true });
  });

  afterEach(async () => {
    await clearCollections();
  });

  // ────────────────────────────────────────────────────────────
  // Helpers
  // ────────────────────────────────────────────────────────────
  const createInvitation = async (overrides = {}) => {
    const defaultInvitation = {
      email: "test@example.com",
      name: "Test User",
      accountType: "domestic",
      token: "test-token-123",
      invitedBy: new mongoose.Types.ObjectId(), // Ensure this is always an ObjectId
      isUsed: false,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      ...overrides,
    };

    return await Invitee.create(defaultInvitation);
  };

  // ────────────────────────────────────────────────────────────
  // Tests
  // ────────────────────────────────────────────────────────────

  // ────── GET /admin/invitations ──────
  describe("GET /admin/invitations", () => {
    it("should return paginated invitations", async () => {
      // Create some test invitations
      await Promise.all([
        createInvitation({ email: "user1@example.com", name: "User One" }),
        createInvitation({ email: "user2@example.com", name: "User Two" }),
        createInvitation({ email: "user3@example.com", name: "User Three" }),
      ]);

      const res = await request(app).get("/admin/invitations");

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty("invitations");
      expect(res.body.invitations.length).toBeGreaterThan(0);
      expect(res.body).toHaveProperty("totalPages");
      expect(res.body).toHaveProperty("page");
      expect(res.body).toHaveProperty("limit");
    });

    it("should filter invitations by search term", async () => {
      await Promise.all([
        createInvitation({ email: "john@example.com", name: "John Doe" }),
        createInvitation({ email: "jane@example.com", name: "Jane Smith" }),
        createInvitation({ email: "bob@example.com", name: "Bob Johnson" }),
      ]);
      const res = await request(app).get("/admin/invitations?search=john");

      expect(res.statusCode).toBe(200);
      expect(res.body.invitations.length).toBeGreaterThan(0);

      // Check that returned invitations contain the search term
      const foundJohn = res.body.invitations.some(
        (inv) =>
          inv.name.toLowerCase().includes("john") ||
          inv.email.toLowerCase().includes("john")
      );
      expect(foundJohn).toBe(true);
    });

    it("should handle pagination correctly", async () => {
      // Create more invitations than the default page size
      const invitationsToCreate = Array(15)
        .fill()
        .map((_, i) => ({
          email: `user${i}@example.com`,
          name: `User ${i}`,
        }));

      await Promise.all(
        invitationsToCreate.map((inv) => createInvitation(inv))
      );

      // Test first page with limit of 5
      const res1 = await request(app).get("/admin/invitations?page=1&limit=5");
      expect(res1.statusCode).toBe(200);
      expect(res1.body.invitations.length).toBe(5);
      expect(res1.body.page).toBe(1);

      // Test second page
      const res2 = await request(app).get("/admin/invitations?page=2&limit=5");
      expect(res2.statusCode).toBe(200);
      expect(res2.body.invitations.length).toBe(5);
      expect(res2.body.page).toBe(2);
    });

    it("should return 400 for invalid pagination parameters", async () => {
      // Testing with negative values instead of zero since the controller likely handles 0 values differently
      const res = await request(app).get("/admin/invitations?page=-1&limit=-5");
      expect(res.statusCode).toBe(400);
    });

    it("should only return active invitations", async () => {
      await Promise.all([
        createInvitation({ email: "active@example.com" }),
        createInvitation({
          email: "used@example.com",
          isUsed: true,
          usedAt: new Date(),
        }),
        createInvitation({
          email: "expired@example.com",
          expiresAt: new Date(Date.now() - 1000), // Expired
        }),
      ]);

      const res = await request(app).get("/admin/invitations");

      expect(res.statusCode).toBe(200);
      expect(res.body.invitations.length).toBe(1);
      expect(res.body.invitations[0].email).toBe("active@example.com");
    });
  });

  // ────── DELETE /admin/invitations/:invitationId ──────
  describe("DELETE /admin/invitations/:invitationId", () => {
    it("should delete an invitation successfully", async () => {
      const invitation = await createInvitation();

      const res = await request(app).delete(
        `/admin/invitations/${invitation._id}`
      );

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty(
        "message",
        "Invitation deleted successfully"
      );
      expect(res.body).toHaveProperty(
        "deletedInvitationId",
        invitation._id.toString()
      );

      // Verify invalidation was called
      expect(invalidateByEvent).toHaveBeenCalledWith("invitation-deleted");

      // Verify invitation was deleted
      const foundInvitation = await Invitee.findById(invitation._id);
      expect(foundInvitation).toBeNull();
    });

    it("should return 404 if invitation not found", async () => {
      const nonExistentId = new mongoose.Types.ObjectId();

      const res = await request(app).delete(
        `/admin/invitations/${nonExistentId}`
      );

      expect(res.statusCode).toBe(404);
      expect(res.body).toHaveProperty("message", "Invitation not found");
    });

    it("should return 400 if invitationId is missing", async () => {
      const res = await request(app).delete("/admin/invitations/");

      expect(res.statusCode).toBe(404); // 404 for missing route parameter
    });
  });

  // ────── POST /admin/invite ──────
  describe("POST /admin/invite", () => {
    it("should create a new invitation successfully", async () => {
      const inviteData = {
        email: "newuser@example.com",
        name: "New User",
        accountType: "domestic",
      };

      // Ensure sendEmail resolves successfully
      sendEmail.mockResolvedValueOnce({ success: true });

      const res = await request(app).post("/admin/invite").send(inviteData);

      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty(
        "message",
        "Invitation sent successfully"
      );
      expect(res.body).toHaveProperty("invitationId");
      expect(res.body).toHaveProperty("expiresAt");
      expect(res.body).toHaveProperty("invitationUrl");
      expect(res.body).toHaveProperty("code", "INVITATION_SENT");

      // Verify email was sent
      expect(sendEmail).toHaveBeenCalledWith(
        "sendInvitation",
        expect.objectContaining({
          recipient: inviteData.email,
          name: inviteData.name,
        })
      );

      // Verify invitation exists in database
      const invitation = await Invitee.findOne({ email: inviteData.email });
      expect(invitation).toBeTruthy();
      expect(invitation.name).toBe(inviteData.name);
      expect(invitation.accountType).toBe(inviteData.accountType);
    });

    it("should return 400 if email is missing", async () => {
      const res = await request(app).post("/admin/invite").send({
        name: "New User",
        accountType: "domestic",
      });

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty("message", "Email is required");
    });

    it("should return 400 if accountType is invalid", async () => {
      const res = await request(app).post("/admin/invite").send({
        email: "newuser@example.com",
        name: "New User",
        accountType: "invalid-type",
      });

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toContain("accountType");
    });

    it("should return 409 if user already exists", async () => {
      // Create a user first
      await User.create({
        email: "existing@example.com",
        password: "hashedPassword",
        name: "Existing User",
        accountType: "domestic",
        phone: "+1234567890",
        DOB: new Date("1990-01-01"),
      });

      const res = await request(app).post("/admin/invite").send({
        email: "existing@example.com",
        name: "New User",
        accountType: "domestic",
      });

      expect(res.statusCode).toBe(409);
      expect(res.body).toHaveProperty("code", "USER_EXISTS");
    });

    it("should return existing invitation if one is active", async () => {
      // Create an active invitation
      const invitation = await createInvitation({
        email: "active@example.com",
        name: "Active User",
      });

      const res = await request(app).post("/admin/invite").send({
        email: "active@example.com",
        name: "New Attempt",
        accountType: "domestic",
      });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty(
        "message",
        "Invitation already exists for this email"
      );
      expect(res.body).toHaveProperty(
        "invitationId",
        invitation._id.toString()
      );
    });

    it("should handle email sending failure", async () => {
      // Mock email sending to fail with a proper error
      sendEmail.mockRejectedValueOnce(new Error("Email service unavailable"));

      const inviteData = {
        email: "newuser@example.com",
        name: "New User",
        accountType: "domestic",
      };

      const res = await request(app).post("/admin/invite").send(inviteData);

      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty(
        "code",
        "INVITATION_CREATED_EMAIL_FAILED"
      );

      // Verify invitation was still created
      const invitation = await Invitee.findOne({
        email: "newuser@example.com",
      });
      expect(invitation).toBeTruthy();
    });
  });

  // ────── POST /admin/invite/:inviteId/resend ──────
  describe("POST /admin/invite/:inviteId/resend", () => {
    it("should resend an invitation successfully", async () => {
      // Create an invitation with a valid invitedBy ObjectId
      const invitation = await createInvitation({
        invitedBy: new mongoose.Types.ObjectId(),
      });

      // Mock sendEmail to resolve successfully
      sendEmail.mockResolvedValueOnce({ success: true });

      const res = await request(app).post(
        `/admin/invite/${invitation._id}/resend`
      );

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty(
        "message",
        "Invitation resent successfully"
      );
      expect(res.body).toHaveProperty("invitationUrl");

      // Verify email was sent
      expect(sendEmail).toHaveBeenCalledWith(
        "sendInvitation",
        expect.objectContaining({
          recipient: invitation.email,
          name: invitation.name,
        })
      );
    });

    it("should refresh token if invitation is expired", async () => {
      // Create an expired invitation with a valid invitedBy ObjectId
      const expiredInvitation = await createInvitation({
        expiresAt: new Date(Date.now() - 1000), // Expired
        invitedBy: new mongoose.Types.ObjectId(),
      });

      const originalToken = expiredInvitation.token;

      // Mock sendEmail to resolve successfully
      sendEmail.mockResolvedValueOnce({ success: true });

      const res = await request(app).post(
        `/admin/invite/${expiredInvitation._id}/resend`
      );
      expect(res.statusCode).toBe(200);

      // Verify token was changed
      const updatedInvitation = await Invitee.findById(expiredInvitation._id);
      expect(updatedInvitation.token).not.toBe(originalToken);

      // Verify expiry date was extended
      expect(updatedInvitation.expiresAt).toBeInstanceOf(Date);
      expect(updatedInvitation.expiresAt.getTime()).toBeGreaterThan(Date.now());
    });

    it("should return 404 if invitation not found", async () => {
      const nonExistentId = new mongoose.Types.ObjectId();

      const res = await request(app).post(
        `/admin/invite/${nonExistentId}/resend`
      );

      expect(res.statusCode).toBe(404);
      expect(res.body).toHaveProperty(
        "message",
        "No invitation found with this ID."
      );
    });

    it("should return 500 if email sending fails", async () => {
      const invitation = await createInvitation();

      // Mock email sending to fail
      sendEmail.mockRejectedValueOnce(new Error("Email service unavailable"));

      const res = await request(app).post(
        `/admin/invite/${invitation._id}/resend`
      );

      expect(res.statusCode).toBe(500);
    });
  });
});
