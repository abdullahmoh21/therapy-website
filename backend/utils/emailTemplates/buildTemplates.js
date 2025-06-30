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

  alert: {
    title: "System Alert - High Priority",
    message:
      "There has been an unusual activity detected in the system. Please review the logs and take appropriate action immediately.",
    actionText: "View Details",
    actionLink: "https://admin.fatimanaqvi.com/alerts/123",
  },

  invite: {
    name: "John Doe",
    link: "https://fatimanaqvi.com/register?token=abc123xyz",
  },

  resetPassword: {
    name: "Jane Smith",
    link: "https://fatimanaqvi.com/reset-password?token=reset123xyz",
  },

  contactMe: {
    name: "Sarah Johnson",
    type: "Consultation Request",
    email: "sarah.johnson@email.com",
    phone: "+1 (555) 123-4567",
    message:
      "Hi, I would like to schedule a consultation for anxiety management. I have been dealing with work stress and would appreciate professional guidance.",
  },

  contactMeConfirmation: {
    name: "Sarah Johnson",
  },

  verifyEmail: {
    name: "Michael Brown",
    link: "https://fatimanaqvi.com/verify-email?token=verify123xyz",
  },

  eventDeleted: {
    name: "Alice Wilson",
    eventDate: "December 15, 2024",
    eventTime: "2:00 PM",
    reason: "Could not validate user",
  },

  lateCancellation: {
    userName: "David Thompson",
    cancelCutoffDays: 3,
    cancellationDate: "December 19, 2024",
    formattedDate: "December 22, 2024",
    isAdminCancelled: false,
    booking: {
      bookingId: "BK-2024-003",
      cancellation: {
        cancelledBy: "client",
        reason: "Personal emergency",
      },
    },
    payment: {
      amount: "200.00",
      paymentCurrency: "PKR",
      transactionStatus: "completed",
      transactionReferenceNumber: "TXN-2024-003",
    },
  },

  refundRequest: {
    name: "Lisa Anderson",
    userEmail: "lisa.anderson@email.com",
    bookingId: "208",
    eventDate: "December 25, 2024",
    eventTime: "2:00 PM",
    cancelledWithinPolicyPeriod: "Yes",
    cancelCutoffDays: 3,
    paymentAmount: "1800",
    paymentStatus: "completed",
    paymentCompleted: "December 15, 2024",
    transactionReferenceNumber: "TXN-2024-002",
    refundLink: "https://secure.safepay.pk/dashboard/payments/TXN-2024-002",
  },

  refundConfirmation: {
    name: "Lisa Anderson",
    bookingId: "209",
    eventDate: "December 25, 2024",
    eventTime: "2:00 PM",
    paymentAmount: "1800",
    paymentStatus: "completed",
    paymentCompleted: "December 15, 2024",
    transactionReferenceNumber: "TXN-2024-002",
    adminEmail: "admin@fatimanaqvi.com",
  },

  unauthorizedBooking: {
    clientName: "Mark Wilson",
    eventDate: "December 25, 2024",
    eventTime: "2:00 PM",
  },

  adminCancellationNotif: {
    isLateCancellation: false,
    isPaid: true,
    cancelledBy: "Admin",
    cancelCutoffDays: 3,
    isAdminCancelled: false,
    name: "Robert Johnson",
    userEmail: "robert.johnson@email.com",
    bookingId: "BK-2024-005",
    eventDate: "December 28, 2024",
    eventTime: "3:00 PM",
    cancellationDate: "December 26, 2024",
    paymentAmount: "2500",
    paymentCurrency: "PKR",
    paymentStatus: "Pending",
    paymentCompleted: "December 20, 2024",
    transactionReferenceNumber: "TXN-2024-005",
    refundLink: "https://secure.safepay.pk/dashboard/payments/TXN-2024-005",
    reason: "aiwi bc dimagh set hogeya",
  },

  userCancellationNotif: {
    name: "Emily Davis",
    bookingId: "BK-2024-006",
    eventDate: "January 15, 2025",
    eventTime: "10:00 AM",
    cancelledByDisplay: "Client",
    cancellationDate: "January 10, 2025",
    reason: "Schedule conflict - work meeting moved",
    isAdminCancelled: false,
    isUnpaid: false,
    isRefundEligible: true,
    isRefundIneligible: false,
    cancelCutoffDays: 3,
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
