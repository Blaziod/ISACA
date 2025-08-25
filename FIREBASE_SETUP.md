# Firebase Setup Instructions

## Quick Setup (5 minutes)

### 1. Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project"
3. Enter project name: `access-idcode` (or your preferred name)
4. Accept terms and click "Continue"
5. Disable Google Analytics (not needed) and click "Create project"

### 2. Enable Realtime Database

1. In your Firebase project, click "Realtime Database" in the left sidebar
2. Click "Create Database"
3. Choose "Start in test mode" (we'll secure it later)
4. Select your preferred region (choose closest to your users)
5. Click "Done"

### 3. Get Configuration

1. Click the gear icon ⚙️ and select "Project settings"
2. Scroll down to "Your apps" section
3. Click the web icon `</>` to add a web app
4. Enter app name: `Access IDCODE Web App`
5. Check "Also set up Firebase Hosting" (optional)
6. Click "Register app"
7. Copy the `firebaseConfig` object shown

### 4. Update Your App

1. Copy `.env.example` to `.env.local`
2. Open `.env.local` and replace the placeholder values with your actual Firebase config:

```bash
VITE_FIREBASE_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_DATABASE_URL=https://your-project-default-rtdb.firebaseio.com
VITE_FIREBASE_PROJECT_ID=your-project
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdefghijklmnop
VITE_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX
```

**Note**: The `firebaseConfig.js` file is already configured to use these environment variables automatically.

### 5. Set Database Rules (Important!)

**This is the most common issue! If you see "Firebase unavailable" errors, this is likely the problem.**

1. Go back to Realtime Database in Firebase Console
2. Click "Rules" tab
3. Replace the default rules with:

```json
{
  "rules": {
    ".read": true,
    ".write": true
  }
}
```

4. Click "Publish" to save the rules

**⚠️ Important:** The default rules look like this and will block all access:

```json
{
  "rules": {
    ".read": false,
    ".write": false
  }
}
```

If you see this, change it to the open rules above.

**Note**: These rules allow anyone to read/write. For production, you should implement proper authentication and security rules.

### 6. Test Your Setup

1. Run your app: `yarn dev`

```json
{
  "rules": {
    "registeredUsers": {
      ".read": "auth != null",
      ".write": "auth != null && (auth.uid == 'admin-uid' || root.child('admins').child(auth.uid).exists())"
    },
    "scanInList": {
      ".read": "auth != null",
      ".write": "auth != null"
    },
    "scanOutList": {
      ".read": "auth != null",
      ".write": "auth != null"
    }
  }
}
```

### 3. Environment Variables

Store your Firebase config in environment variables:

```bash
# .env.local
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_DATABASE_URL=https://your_project-default-rtdb.firebaseio.com
VITE_FIREBASE_PROJECT_ID=your_project
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=your_app_id
```

## Benefits of Firebase

✅ **Persistent Storage**: Data survives deployments
✅ **Real-time Sync**: Changes appear instantly on all devices  
✅ **Offline Support**: Works without internet connection
✅ **Auto Backup**: Firebase handles backups and reliability
✅ **Scalable**: Handles thousands of users
✅ **Free Tier**: 1GB storage, 10GB transfer per month

## Troubleshooting

### "Firebase unavailable" message

- Check your internet connection
- Verify firebaseConfig.js has correct values
- Check Firebase Console for database status

### Data not syncing

- Check browser console for errors
- Verify database rules allow read/write
- Try refreshing the page

### Can't see data in Firebase Console

- Data might be in localStorage only
- Check if you're online when making changes
- Verify the database URL in your config

## Need Help?

1. Check the browser console for error messages
2. Verify your Firebase configuration
3. Test with a simple write to Firebase Console
4. Check Firebase usage quotas

Your data will now persist across deployments! 🎉
