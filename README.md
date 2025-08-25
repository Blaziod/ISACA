# Access IDCODE - QR Code Access Control System

A React-based access control system with QR code scanning, user registration, and automated email notifications.

## Features

- **QR Code Scanning** - Real-time QR code scanning for check-in/check-out
- **Manual Code Entry** - Backup option for manual entry when QR fails
- **User Registration** - Single and bulk user registration with automated QR code generation
  - Full Name, Email, Phone Number (required)
  - ISACA ID, Participation Category, Organisation, Designation (optional)
  - Automated backup code generation
- **Bulk Registration** - CSV/JSON file upload for bulk user registration
  - Template download with proper format
  - Supports CSV files exported from Excel/Google Sheets
  - Automatic field mapping and validation
- **Email Notifications** - Automated welcome emails with QR codes sent to new users
- **Cloud Storage** - Hybrid local/cloud storage with automatic sync
- **Registered Users Management** - View, manage, and download QR codes for all users
- **Attendance Tracking** - Comprehensive scan in/out lists with timestamps and export capabilities

## Quick Start

1. **Install Dependencies**

   ```bash
   yarn install
   ```

2. **Configure Email Service** (Optional)
   See [EMAIL_SETUP.md](./EMAIL_SETUP.md) for detailed instructions on setting up automated email notifications.

3. **Start Development Server**

   ```bash
   yarn dev
   ```

4. **Build for Production**
   ```bash
   yarn build
   ```

## Core Functionality

### Registration Fields

The system supports the following user fields:

**Required Fields:**

- Full Name
- Email Address
- Phone Number

**Optional Fields:**

- ISACA ID
- Participation Category (Physical/Virtual/Hybrid)
- Organisation
- Designation (Job Title)
- Backup Code (auto-generated if not provided)
- Notes

### Bulk Registration

The system supports bulk user registration via CSV or JSON files:

1. **Download Template** - Get the correct format template
2. **Prepare Data** - Fill in user data following the CSV format:
   ```
   S/N,Name,Phone Number,Email,ISACA ID,Participation Category,Organisation,Designation
   ```
3. **Upload File** - Upload CSV or JSON file via the bulk upload interface
4. **Preview & Confirm** - Review data before final registration
5. **Automated Processing** - QR codes generated and emails sent automatically

### QR Code Workflow

1. Users register and automatically receive QR codes
2. QR codes contain user ID, name, and email as JSON
3. Users can download their QR codes as PNG files
4. QR scanning automatically checks users in/out with timestamp tracking

### Email Integration

- Welcome emails sent automatically upon registration
- QR codes attached as images in emails
- Bulk email support for bulk user registration
- Progress tracking for bulk email operations

## Technology Stack

- **React 18+** with functional components and hooks
- **Vite** for fast development and building
- **EmailJS** for client-side email sending
- **html5-qrcode** for QR code scanning
- **qrcode** library for QR code generation
- **jsPDF** for PDF export functionality

## File Structure

```
src/
├── components/          # Reusable components
├── pages/              # Main application pages
├── utils/              # Utility functions and services
├── styles/             # Global styles
└── assets/             # Static assets
```

## Configuration

The application stores data in browser localStorage. For production use, consider implementing a proper backend with database storage.

For email functionality setup, see [EMAIL_SETUP.md](./EMAIL_SETUP.md).

## Template Reference

This template uses Vite with React and includes:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh
