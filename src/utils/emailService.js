import emailjs from "@emailjs/browser";

// EmailJS configuration
const EMAIL_CONFIG = {
  SERVICE_ID: "service_a383kuu",
  TEMPLATE_ID: "template_orrs17r",
  PUBLIC_KEY: "j7W73UosW-ZnAApXI",
};

// Initialize EmailJS
export const initEmailJS = () => {
  emailjs.init(EMAIL_CONFIG.PUBLIC_KEY);
};

// Convert data URL to blob for email attachment
const dataURLtoBlob = (dataURL) => {
  const arr = dataURL.split(",");
  const mime = arr[0].match(/:(.*?);/)[1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
};

// Convert blob to base64 for email attachment
const blobToBase64 = (blob) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

// Send welcome email with QR code
export const sendWelcomeEmail = async (user) => {
  try {
    // Convert QR code to blob and then to base64
    const qrBlob = dataURLtoBlob(user.qrCode);
    const qrBase64 = await blobToBase64(qrBlob);

    const templateParams = {
      to_name: user.name,
      to_email: user.email,
      user_id: user.id,
      backup_code: user.backupCode,
      department: user.department || "Not specified",
      registration_date: new Date(user.registeredAt).toLocaleDateString(),
      qr_code_attachment: qrBase64,
      reply_to: "noreply@accessidcode.com",
    };

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
