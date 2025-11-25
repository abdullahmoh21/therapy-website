const fs = require("fs");
const path = require("path");
const handlebars = require("handlebars");

const args = process.argv.slice(2);
const specificTemplate = args.find((arg) => !arg.startsWith("--"));

const templatesDir = __dirname;
const outputDir = path.join(templatesDir, "build");

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const mockData = {
  frontend_url: "https://fatimanaqvi.com",
  currentYear: new Date().getFullYear(),

  // system_alert.hbs
  system_alert: {
    title: "System Alert - High Priority",
    message:
      "There has been unusual activity detected in the system. Please review the logs and take appropriate action immediately.",
    actionText: "View Details",
    actionLink: "https://admin.fatimanaqvi.com/alerts/123",
  },

  // user_invitation.hbs
  user_invitation: {
    name: "Sophia Martinez",
    link: "https://fatimanaqvi.com/register?token=invite-abc123xyz456",
  },

  // user_password_reset.hbs
  user_password_reset: {
    name: "Ahmed Khan",
    link: "https://fatimanaqvi.com/reset-password?token=reset-xyz789abc123",
  },

  // admin_contact_inquiry.hbs
  admin_contact_inquiry: {
    name: "Sarah Johnson",
    type: "General Inquiry",
    email: "sarah.johnson@email.com",
    phone: "+92 300 1234567",
    message:
      "Hi, I would like to schedule a consultation for anxiety management. I have been dealing with work stress and would appreciate professional guidance. Could you please let me know your availability for the next week?",
  },

  // user_contact_inquiry_confirmation.hbs
  user_contact_inquiry_confirmation: {
    name: "Sarah Johnson",
  },

  // user_account_verification.hbs
  user_account_verification: {
    name: "Michael Brown",
    link: "https://fatimanaqvi.com/verify-email?token=verify-def456ghi789",
  },

  // user_session_deletion_notice.hbs
  user_session_deletion_notice: {
    name: "Alice Wilson",
    eventDate: "December 15, 2024",
    eventTime: "2:00 PM PST",
  },

  // refundRequest.hbs (admin notification)
  refundRequest: {
    name: "Lisa Anderson",
    userEmail: "lisa.anderson@email.com",
    bookingId: "BK-2024-208",
    eventDate: "January 10, 2025",
    eventTime: "3:30 PM PST",
    cancelledWithinPolicyPeriod: "Yes",
    cancelCutoffDays: 3,
    paymentAmount: "8,500",
    paymentStatus: "Completed",
    paymentCompleted: "December 28, 2024",
    transactionReferenceNumber: "SPY-20241228-987654",
    refundLink:
      "https://secure.safepay.pk/dashboard/payments/SPY-20241228-987654",
  },

  // user_payment_refund_confirmation.hbs
  user_payment_refund_confirmation: {
    name: "Lisa Anderson",
    bookingId: "BK-2024-208",
    eventDate: "January 10, 2025",
    eventTime: "3:30 PM PST",
    paymentAmount: "8,500",
    paymentStatus: "Completed",
    paymentCompleted: "December 28, 2024",
    transactionReferenceNumber: "SPY-20241228-987654",
  },

  // user_unauthorized_booking_notice.hbs
  user_unauthorized_booking_notice: {
    clientName: "Mark Wilson",
    eventDate: "January 20, 2025",
    eventTime: "11:00 AM PST",
  },

  // admin_booking_cancellation_alert.hbs
  admin_booking_cancellation_alert: {
    name: "Robert Johnson",
    userEmail: "robert.johnson@email.com",
    bookingId: "BK-2024-305",
    eventDate: "January 5, 2025",
    eventTime: "4:00 PM PST",
    cancelledBy: "Client",
    cancellationDate: "December 30, 2024",
    paymentStatus: "Completed",
    paymentAmount: "9,200",
    paymentCurrency: "PKR",
    paymentCompleted: "December 22, 2024",
    transactionReferenceNumber: "SPY-20241222-123456",
    reason: "Personal emergency - family matter requires immediate attention",
    isAdminCancelled: false,
  },

  // user_session_cancellation_confirmation.hbs
  user_session_cancellation_confirmation: {
    name: "Emily Davis",
    bookingId: "BK-2024-406",
    eventDate: "January 18, 2025",
    eventTime: "10:00 AM PST",
    cancelledByDisplay: "Client",
    cancellationDate: "January 12, 2025",
    reason: "Schedule conflict - unexpected work commitment",
    isAdminCancelled: false,
    isUnpaid: false,
    isRefundEligible: true,
    isRefundIneligible: false,
    cancelCutoffDays: 3,
  },

  // user_session_cancelled_by_admin.hbs
  user_session_cancelled_by_admin: {
    name: "Daniel Cooper",
    bookingId: "BK-2024-507",
    eventDate: "January 22, 2025",
    eventTime: "1:00 PM PST",
    cancellationDate: "January 15, 2025",
    reason:
      "Therapist unavailability due to emergency - we apologize for the inconvenience",
  },
};

function getMockDataForTemplate(templateName) {
  const baseData = {
    frontend_url: mockData.frontend_url,
    currentYear: mockData.currentYear,
  };

  // Add specific mock data for the template
  const specificData = mockData[templateName] || {};

  return { ...baseData, ...specificData };
}

function buildTemplate(templateFile) {
  const templateName = path.basename(templateFile, ".hbs");
  const templatePath = path.join(templatesDir, templateFile);
  const outputPath = path.join(outputDir, `${templateName}.html`);

  try {
    const templateContent = fs.readFileSync(templatePath, "utf8");

    const template = handlebars.compile(templateContent);
    const data = getMockDataForTemplate(templateName);
    const html = template(data);

    fs.writeFileSync(outputPath, html);

    console.log(`✅ Built ${templateName}.hbs → ${templateName}.html`);
    return true;
  } catch (error) {
    console.error(`❌ Error building ${templateName}.hbs:`, error.message);
    return false;
  }
}

// Function to delete existing HTML file
function deleteExistingHTML(templateName) {
  const outputPath = path.join(outputDir, `${templateName}.html`);
  if (fs.existsSync(outputPath)) {
    fs.unlinkSync(outputPath);
    console.log(`🗑️  Deleted existing ${templateName}.html`);
  }
}

// Main execution
function main() {
  console.log("📧 Email Template Builder");
  console.log("========================\n");

  if (specificTemplate) {
    // Build specific template
    const templateFile = `${specificTemplate}.hbs`;
    const templatePath = path.join(templatesDir, templateFile);

    if (!fs.existsSync(templatePath)) {
      console.error(`❌ Template ${templateFile} not found!`);
      process.exit(1);
    }

    console.log(`Building specific template: ${specificTemplate}\n`);

    // Delete existing HTML file first
    deleteExistingHTML(specificTemplate);

    // Build the template
    const success = buildTemplate(templateFile);

    if (success) {
      console.log(`\n✨ Successfully built ${specificTemplate}.html`);
    } else {
      console.log(`\n💥 Failed to build ${specificTemplate}.html`);
      process.exit(1);
    }
  } else {
    // Build all templates
    console.log("Building all templates...\n");

    // Get all .hbs files
    const templateFiles = fs
      .readdirSync(templatesDir)
      .filter((file) => file.endsWith(".hbs"))
      .sort();

    if (templateFiles.length === 0) {
      console.log("No .hbs template files found!");
      return;
    }

    let successCount = 0;
    let failCount = 0;

    // Build each template
    templateFiles.forEach((templateFile) => {
      const success = buildTemplate(templateFile);
      if (success) {
        successCount++;
      } else {
        failCount++;
      }
    });

    // Summary
    console.log("\n📊 Build Summary:");
    console.log(`✅ Successfully built: ${successCount} templates`);
    if (failCount > 0) {
      console.log(`❌ Failed to build: ${failCount} templates`);
    }
    console.log(`📁 Output directory: ${outputDir}`);
  }
}

// Run the script
main();
