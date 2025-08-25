# Backend Setup for ISACA Access Control

This backend provides persistent storage for the Access IDCODE system across devices.

## Files Structure

```
backend/
├── api.php          # Main API endpoint
├── .htaccess        # URL rewriting rules
└── data/            # Data storage directory (auto-created)
    ├── registeredUsers.json
    ├── scanInList.json
    └── scanOutList.json
```

## Installation on Your Server

1. **Upload Files**

   - Upload `api.php` and `.htaccess` to your server (e.g., in `/public_html/api/`)
   - Make sure the directory is writable (755 permissions)

2. **URL Structure**
   Your API will be accessible at:

   ```
   https://isaca.idcode.ng/api/registeredUsers
   https://isaca.idcode.ng/api/scanInList
   https://isaca.idcode.ng/api/scanOutList
   https://isaca.idcode.ng/api/health
   ```

3. **Test the API**
   Visit: `https://isaca.idcode.ng/api/health`
   Should return: `{"status":"ok","timestamp":1234567890}`

## API Endpoints

### Health Check

- **GET** `/api/health` - Check if API is working

### Data Operations

- **GET** `/api/registeredUsers` - Get all registered users
- **POST** `/api/registeredUsers` - Save registered users data
- **GET** `/api/scanInList` - Get scan-in list
- **POST** `/api/scanInList` - Save scan-in list
- **GET** `/api/scanOutList` - Get scan-out list
- **POST** `/api/scanOutList` - Save scan-out list

### Utility

- **DELETE** `/api/clear` - Clear all data
- **GET** `/api/backup` - Download backup of all data

## Security Features

- CORS enabled only for your domain (isaca.idcode.ng)
- Input validation and sanitization
- File access restrictions
- Error handling

## Data Storage

Data is stored in JSON files:

- `registeredUsers.json` - All user registrations
- `scanInList.json` - Current checked-in users
- `scanOutList.json` - Check-out history

## Backup

Regular backups can be downloaded via:
`https://isaca.idcode.ng/api/backup`

This will download a JSON file with all your data.
