const JOB_NAMES = require("../../../utils/queue/jobNames");
const jobHandlers = require("../../../utils/queue/jobs/index");

describe("Job Registry Integrity", () => {
  it("should have a handler registered for every job name constant", () => {
    const definedJobNames = Object.values(JOB_NAMES);
    const registeredHandlers = Object.keys(jobHandlers);

    const missingHandlers = definedJobNames.filter(
      (jobName) => !registeredHandlers.includes(jobName)
    );

    if (missingHandlers.length > 0) {
      console.error("Missing handlers for jobs:", missingHandlers);
    }

    expect(missingHandlers).toHaveLength(0);
  });

  it("should not have handlers for undefined job names (optional cleanup check)", () => {
    const definedJobNames = Object.values(JOB_NAMES);
    const registeredHandlers = Object.keys(jobHandlers);
    
    // This test is just to ensure we don't have dead code or typos in the registry keys
    // that aren't in our constants file.
    const unknownHandlers = registeredHandlers.filter(
      (handlerName) => !definedJobNames.includes(handlerName)
    );
    
    if (unknownHandlers.length > 0) {
      console.warn("Handlers registered without a corresponding JOB_NAME constant:", unknownHandlers);
    }

    expect(unknownHandlers).toHaveLength(0);
  });
});
