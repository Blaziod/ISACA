# Email Service Configuration Guide

This application uses EmailJS to send welcome emails with QR codes to newly registered users. Follow these steps to configure the email service:

## 1. Create EmailJS Account

1. Visit [EmailJS.com](https://www.emailjs.com/)
2. Sign up for a free account
3. Verify your email address

## 2. Create Email Service

1. In your EmailJS dashboard, go to **Email Services**
2. Click **Add New Service**
3. Choose your email provider (Gmail, Outlook, etc.)
4. Follow the setup instructions for your provider
5. Note down your **Service ID**

## 3. Create Email Template

1. Go to **Email Templates** in your dashboard
2. Click **Create New Template**
3. Use this template structure:

```html
<!DOCTYPE html>
<html>
  <head>
    <style>
      body {
        font-family: Arial, sans-serif;
      }
      .container {
        max-width: 600px;
        margin: 0 auto;
        padding: 20px;
      }
      .header {
        background: #4caf50;
        color: white;
        padding: 20px;
        text-align: center;
      }
      .content {
        padding: 20px;
        background: #f9f9f9;
      }
      .qr-section {
        text-align: center;
        margin: 20px 0;
      }
      .footer {
        text-align: center;
        color: #666;
        font-size: 12px;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>Welcome to Access IDCODE!</h1>
      </div>
      <div class="content">
        <h2>Hello {{to_name}},</h2>
        <p>Welcome! Your registration has been completed successfully.</p>

        <h3>Your Details:</h3>
        <ul>
          <li><strong>User ID:</strong> {{user_id}}</li>
          <li><strong>Email:</strong> {{to_email}}</li>
          <li><strong>Department:</strong> {{department}}</li>
          <li><strong>Backup Code:</strong> {{backup_code}}</li>
          <li><strong>Registration Date:</strong> {{registration_date}}</li>
        </ul>

        <div class="qr-section">
          <h3>Your QR Code</h3>
          <p>Use this QR code for quick check-in/check-out:</p>
          <img
            src="data:image/png;base64,{{qr_code_attachment}}"
            alt="Your QR Code"
            style="max-width: 200px;"
          />
        </div>

        <p>Please save this email and your QR code for future reference.</p>
      </div>
      <div class="footer">
        <p>This is an automated message from Access IDCODE system.</p>
      </div>
    </div>
  </body>
</html>
```

4. Note down your **Template ID**

## 4. Get Public Key

1. Go to **Account** > **General**
2. Find your **Public Key**
3. Copy it for configuration

## 5. Configure the Application

1. Open `src/utils/emailService.js`
2. Replace the placeholder values:

```javascript
const EMAIL_CONFIG = {
  SERVICE_ID: "your_actual_service_id", // Replace with your Service ID
  TEMPLATE_ID: "your_actual_template_id", // Replace with your Template ID
  PUBLIC_KEY: "your_actual_public_key", // Replace with your Public Key
};
```

## 6. Test the Configuration

1. Register a new user in the application
2. Check if the welcome email is sent successfully
3. Verify that the QR code attachment is included

## Template Variables

The following variables are available in your email template:

- `{{to_name}}` - User's full name
- `{{to_email}}` - User's email address
- `{{user_id}}` - Generated user ID
- `{{backup_code}}` - User's backup code
- `{{department}}` - User's department
- `{{registration_date}}` - Registration date
- `{{qr_code_attachment}}` - Base64 encoded QR code image

## Troubleshooting

### Common Issues:

1. **Email not sending:**

   - Check if your EmailJS service is properly configured
   - Verify your API limits haven't been exceeded
   - Check browser console for error messages

2. **QR code not appearing:**

   - Ensure the template includes the QR code image tag
   - Check that the `qr_code_attachment` variable is used correctly

3. **Template not found:**
   - Verify your Template ID is correct
   - Make sure the template is published/active

### Rate Limits:

- EmailJS free tier allows 200 emails/month
- There's a rate limit of ~1 email per second
- For bulk operations, the app includes delays between emails

## Support

For EmailJS specific issues, visit their [documentation](https://www.emailjs.com/docs/) or contact their support team.
