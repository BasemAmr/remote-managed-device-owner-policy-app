# Self-Control Backend API

Backend server for the Self-Control device management system.

## 🚀 Quick Start

### Prerequisites
- Node.js 20+ installed
- PostgreSQL database (Neon recommended)
- npm or yarn

### Installation

1. **Install dependencies:**
```bash
npm install
```

2. **Configure environment:**
   - Copy `.env` file and update with your database credentials
   - Update `DATABASE_URL` with your Neon connection string
   - Change `JWT_SECRET` and `DEVICE_TOKEN_SECRET` to secure random strings

3. **Run the server:**

**Development mode (with auto-reload):**
```bash
npm run dev
```

**Production mode:**
```bash
npm start
```

The server will start on `http://localhost:3000`

## 📡 API Endpoints

### Health Check
- `GET /` - API information
- `GET /health` - Health status

### Device API (`/api/device`)
- `POST /register` - Register a new device
- `GET /policies` - Get current policies (requires device token)
- `POST /violations` - Report a violation (requires device token)
- `POST /requests` - Submit approval request (requires device token)
- `GET /requests/:request_id` - Check approval status (requires device token)

### Management API (`/api/management`)
- `GET /devices` - List all devices
- `GET /devices/:device_id/apps` - Get installed apps
- `PUT /devices/:device_id/settings` - Update device settings
- `POST /policies/apps` - Add/update app policy
- `POST /policies/urls` - Add URL to blacklist
- `DELETE /policies/urls/:id` - Remove URL from blacklist
- `GET /requests` - Get pending approval requests
- `PUT /requests/:id` - Approve/deny request
- `GET /violations` - Get violation logs

## 🗄️ Database Setup

The database schema is in the main project documentation. Make sure to:
1. Create a Neon database
2. Run the SQL schema to create all tables
3. Update the `DATABASE_URL` in `.env`

## 🔐 Authentication

- **Device Authentication:** Uses JWT tokens with `DEVICE_TOKEN_SECRET`
- **Admin Authentication:** Uses JWT tokens with `JWT_SECRET` (to be implemented)

## 📝 Environment Variables

```env
DATABASE_URL=postgresql://...
PORT=3000
NODE_ENV=development
JWT_SECRET=your-secret-key
DEVICE_TOKEN_SECRET=your-device-secret
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=secure-password
```

## 🛠️ Development

The project structure:
```
backend/
├── src/
│   ├── config/
│   │   └── database.js       # Database connection
│   ├── controllers/
│   │   ├── deviceController.js
│   │   └── managementController.js
│   ├── middleware/
│   │   └── auth.js           # JWT authentication
│   ├── routes/
│   │   ├── deviceRoutes.js
│   │   └── managementRoutes.js
│   └── server.js             # Main server file
├── .env                      # Environment variables
├── .gitignore
└── package.json
```

## 📦 Dependencies

- **express** - Web framework
- **pg** - PostgreSQL client
- **dotenv** - Environment variables
- **jsonwebtoken** - JWT authentication
- **bcrypt** - Password hashing
- **cors** - CORS middleware
- **helmet** - Security headers
- **nodemon** - Development auto-reload

## 🚧 Next Steps

1. ✅ Set up database schema in Neon
2. ✅ Configure environment variables
3. ✅ Test server startup
4. 🔲 Test device registration endpoint
5. 🔲 Build Android app
6. 🔲 Build admin dashboard
7. 🔲 Deploy to Render

## 📄 License

ISC
