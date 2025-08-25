import emailjs from "@emailjs/browser";

// EmailJS configuration
const EMAIL_CONFIG = {
  SERVICE_ID: "service_qkhidgl",
  TEMPLATE_ID: "template_orrs17r",
  PUBLIC_KEY: "j7W73UosW-ZnAApXI",
};

// Initialize EmailJS
export const initEmailJS = () => {
  emailjs.init(EMAIL_CONFIG.PUBLIC_KEY);
};

// Test email service with a sample QR code
export const testEmailService = async (testEmail = "test@example.com") => {
  try {
    // Create a simple test QR code data URL
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    canvas.width = 100;
    canvas.height = 100;
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, 100, 100);
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(10, 10, 80, 80);
    const testQRCode = canvas.toDataURL("image/png");

    const templateParams = {
      to_name: "Test User",
      to_email: testEmail,
      user_id: "TEST001",
      backup_code: "123456",
      organisation: "Test Organisation",
      designation: "Test Position",
      isaca_id: "TEST001",
      participation_category: "Physical",
      registration_date: new Date().toLocaleDateString(),
      qr_code_data: testQRCode,
      reply_to: "noreply@accessidcode.com",
    };

    const response = await emailjs.send(
      EMAIL_CONFIG.SERVICE_ID,
      EMAIL_CONFIG.TEMPLATE_ID,
      templateParams
    );

    console.log("Test email sent successfully:", response);
    return {
      success: true,
      message: "Test email sent successfully",
      response,
    };
  } catch (error) {
    console.error("Test email failed:", error);
    return {
      success: false,
      message: "Test email failed",
      error: error.message,
    };
  }
};

// Send welcome email with QR code
export const sendWelcomeEmail = async (user) => {
  try {
    // Debug QR code data
    const qrDebug = debugQRCode(user);

    if (!qrDebug.isValid) {
      console.error("Invalid QR code data:", qrDebug);
      return {
        success: false,
        message: "Invalid QR code data",
        error: "QR code is not a valid data URL",
      };
    }

    // Generate download information
    const downloadInfo = generateQRDownloadInfo(user);

    const templateParams = {
      to_name: user.name,
      to_email: user.email,
      user_id: user.id,
      backup_code: user.backupCode,
      organisation: user.organisation || "Not specified",
      designation: user.designation || "Not specified",
      isaca_id: user.isacaId || "N/A",
      participation_category: user.participationCategory || "Not specified",
      registration_date: new Date(user.registeredAt).toLocaleDateString(),
      qr_code_image: user.qrCode, // This should be used in the email template as {{qr_code_image}}
      qr_filename: downloadInfo.filename,
      qr_download_instruction: downloadInfo.downloadInstruction,
      reply_to: "noreply@accessidcode.com",
    };

    console.log("Sending email with template params:", {
      ...templateParams,
      qr_code_image: templateParams.qr_code_image.substring(0, 50) + "...",
    });

    const response = await emailjs.send(
      EMAIL_CONFIG.SERVICE_ID,
      EMAIL_CONFIG.TEMPLATE_ID,
      templateParams
    );

    return {
      success: true,
      message: "Welcome email sent successfully",
      response,
    };
  } catch (error) {
    console.error("Email sending failed:", error);
    return {
      success: false,
      message: "Failed to send welcome email",
      error: error.message,
    };
  }
};

// Send bulk welcome emails
export const sendBulkWelcomeEmails = async (users, onProgress) => {
  const results = [];
  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < users.length; i++) {
    const user = users[i];

    try {
      // Add delay between emails to avoid rate limiting
      if (i > 0) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      const result = await sendWelcomeEmail(user);
      results.push({ user: user.name, ...result });

      if (result.success) {
        successCount++;
      } else {
        failCount++;
      }

      // Call progress callback if provided
      if (onProgress) {
        onProgress({
          current: i + 1,
          total: users.length,
          successCount,
          failCount,
          currentUser: user.name,
        });
      }
    } catch (error) {
      failCount++;
      results.push({
        user: user.name,
        success: false,
        message: "Failed to send email",
        error: error.message,
      });
    }
  }

  return {
    results,
    summary: {
      total: users.length,
      success: successCount,
      failed: failCount,
    },
  };
};

// Validate email configuration
export const validateEmailConfig = () => {
  const isConfigured =
    EMAIL_CONFIG.SERVICE_ID !== "your_service_id" &&
    EMAIL_CONFIG.TEMPLATE_ID !== "your_template_id" &&
    EMAIL_CONFIG.PUBLIC_KEY !== "your_public_key";

  return {
    isConfigured,
    message: isConfigured
      ? "Email service is configured"
      : "Email service needs configuration. Please update EMAIL_CONFIG in emailService.js",
  };
};

// Debug function to check QR code data
export const debugQRCode = (user) => {
  console.log("=== QR Code Debug Info ===");
  console.log("User:", user.name);
  console.log("QR Code exists:", !!user.qrCode);
  console.log("QR Code type:", typeof user.qrCode);
  console.log(
    "QR Code starts with data:image:",
    user.qrCode?.startsWith("data:image/")
  );
  console.log("QR Code length:", user.qrCode?.length);
  console.log("QR Code preview:", user.qrCode?.substring(0, 100) + "...");
  console.log("========================");

  return {
    isValid: user.qrCode && user.qrCode.startsWith("data:image/"),
    length: user.qrCode?.length || 0,
    type: typeof user.qrCode,
  };
};

// Generate QR code download information
export const generateQRDownloadInfo = (user) => {
  const filename = `${user.name.replace(/\s+/g, "_")}_${user.id}_QR_Code.png`;
  const downloadInstruction = `Right-click on the QR code image and select "Save Image As..." then save as "${filename}"`;

  return {
    filename,
    downloadInstruction,
    userFriendlyName: `${user.name} QR Code`,
  };
};

// Create a data URL for QR code download (for email compatibility)
export const createQRDownloadLink = (qrCodeDataURL, filename) => {
  // Return the data URL with suggested filename
  return {
    href: qrCodeDataURL,
    download: filename,
    instructions: "Right-click and select 'Save Image As...' to download",
  };
};
