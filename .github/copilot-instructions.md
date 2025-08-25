# Copilot Instructions for Access IDCODE

<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

## Project Overview

This is a React application built with Vite for an access control system called "Access IDCODE". The application provides QR scanning capabilities, manual code entry, user registration, and attendance tracking functionality.

## Core Features

1. **QR Scanner** - Real-time QR code scanning for check-in/check-out
2. **Manual Code Entry** - Backup option for manual entry when QR fails
3. **User Registration** - Form for onboarding new individuals with bulk upload support
4. **Registered Users List** - Display total registered users with print/download options
5. **Scan In/Out Lists** - Track attendance with timestamps and export capabilities

## Technical Stack

- React 18+ with functional components and hooks
- Vite for build tooling
- CSS modules or styled components for styling
- QR code scanning library integration
- Local storage or database for data persistence

## Code Guidelines

- Use functional components with React hooks
- Implement proper error handling for QR scanning
- Follow accessibility best practices
- Use responsive design principles
- Implement proper state management
- Include loading states and user feedback
- Separate concerns with dedicated components for each core function
- Use TypeScript-friendly patterns where applicable
