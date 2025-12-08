# Stock Trading Platform

A full-stack stock trading and community platform with real-time chat, pledge management, and advisor features.

## 🚀 Tech Stack

### Frontend
- **React 18** - UI framework
- **Vite** - Build tool & dev server
- **Tailwind CSS** - Styling
- **Shadcn/UI** - Component library
- **React Router** - Navigation
- **Axios** - API client
- **Framer Motion** - Animations

### Backend
- **Node.js + Express** - REST API server
- **MySQL** - Database
- **WebSocket (ws)** - Real-time messaging
- **JWT** - Authentication
- **Bcrypt** - Password hashing

---

## 📋 Prerequisites

Before you begin, ensure you have installed:
- **Node.js** (v18 or higher)
- **MySQL** (v8.0 or higher)
- **npm** or **yarn**

---

## 🛠️ Installation & Setup

### Step 1: Clone the Repository

```bash
git clone <repository-url>
cd stock-trading-platform
```

### Step 2: Install Frontend Dependencies

```bash
npm install
```

### Step 3: Setup Backend

```bash
cd backend_protocall
npm install
```

### Step 4: Configure MySQL Database

1. Create a new MySQL database:
```sql
CREATE DATABASE stock_trading_db;
```

2. Create a `.env` file in `backend_protocall/`:
```env
# Database Configuration
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=stock_trading_db
DB_PORT=3306

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRES_IN=7d

# Server Configuration
PORT=5000
NODE_ENV=development

# WebSocket Configuration
WS_PORT=5001

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:5173
```

### Step 5: Run Database Migrations

```bash
cd backend_protocall
npm run migrate
```

Or manually run the SQL migration files in order:
```bash
mysql -u root -p stock_trading_db < src/migrations/001_initial_schema.sql
mysql -u root -p stock_trading_db < src/migrations/002_chat_tables.sql
# ... continue with other migration files
```

### Step 6: Seed Initial Data (Optional)

```bash
npm run seed
```

---

## 🏃 Running the Application

### Start Backend Server

```bash
cd backend_protocall
npm run dev
```

The API server will start at `http://localhost:5000`
WebSocket server will start at `ws://localhost:5001`

### Start Frontend Development Server

In a new terminal:
```bash
# From root directory
npm run dev
```

The frontend will be available at `http://localhost:5173`

---

## 📁 Project Structure

```
├── src/                          # Frontend source code
│   ├── api/                      # API entities & integrations
│   ├── components/               # React components
│   │   ├── chat/                 # Chat components
│   │   ├── dashboard/            # Dashboard components
│   │   ├── superadmin/           # Admin components
│   │   └── ui/                   # Shadcn UI components
│   ├── hooks/                    # Custom React hooks
│   │   ├── useWebSocket.js       # WebSocket hook
│   │   ├── useChatRoom.js        # Chat room hook
│   │   └── useApi.js             # API fetch hook
│   ├── lib/                      # Utilities
│   │   └── apiClient.js          # Axios API client
│   ├── pages/                    # Page components
│   └── App.jsx                   # Main app component
│
├── backend_protocall/            # Backend source code
│   ├── src/
│   │   ├── config/               # Configuration files
│   │   │   └── database.js       # MySQL connection
│   │   ├── controllers/          # Route controllers
│   │   ├── middleware/           # Express middleware
│   │   │   └── auth.js           # JWT authentication
│   │   ├── models/               # Database models
│   │   │   └── AllModels.js      # All Sequelize models
│   │   ├── routes/               # API routes
│   │   ├── services/             # Business logic
│   │   │   └── WebSocketService.js  # Real-time messaging
│   │   └── migrations/           # Database migrations
│   ├── server.js                 # Server entry point
│   └── package.json              # Backend dependencies
│
└── package.json                  # Frontend dependencies
```

---

## 🔌 API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login user |
| GET | `/api/users/me` | Get current user |

### Chat Rooms
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/chatrooms` | List all chat rooms |
| POST | `/api/chatrooms` | Create chat room |
| GET | `/api/chatrooms/:id` | Get chat room details |
| DELETE | `/api/chatrooms/:id` | Delete chat room |

### Messages
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/messages?chat_room_id=:id` | Get room messages |
| POST | `/api/messages` | Send message |
| PUT | `/api/messages/:id` | Edit message |
| DELETE | `/api/messages/:id` | Delete message |

### Pledges
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/pledges/pledges` | List pledges |
| POST | `/api/pledges/pledges` | Create pledge |
| GET | `/api/pledges/sessions` | List pledge sessions |

---

## 🌐 WebSocket Events

### Client → Server
| Event | Payload | Description |
|-------|---------|-------------|
| `join_room` | `{ roomId }` | Join a chat room |
| `leave_room` | `{ roomId }` | Leave a chat room |
| `chat_message` | `{ roomId, content, ... }` | Send message |
| `typing_start` | `{ roomId }` | User started typing |
| `typing_stop` | `{ roomId }` | User stopped typing |
| `read_messages` | `{ roomId }` | Mark messages as read |

### Server → Client
| Event | Payload | Description |
|-------|---------|-------------|
| `new_message` | `{ message }` | New message received |
| `user_joined` | `{ userId, userName }` | User joined room |
| `user_left` | `{ userId, userName }` | User left room |
| `typing_indicator` | `{ userId, userName }` | User is typing |
| `read_receipt` | `{ userId, messageId }` | Message read receipt |

---

## 🔐 Environment Variables

### Frontend (.env)
```env
VITE_API_URL=http://localhost:5000/api
VITE_WS_URL=ws://localhost:5001
```

### Backend (backend_protocall/.env)
```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=stock_trading_db
DB_PORT=3306
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=7d
PORT=5000
WS_PORT=5001
FRONTEND_URL=http://localhost:5173
```

---

## 🧪 Testing

### Run Frontend Tests
```bash
npm run test
```

### Run Backend Tests
```bash
cd backend_protocall
npm run test
```

---

## 📦 Building for Production

### Build Frontend
```bash
npm run build
```

### Build Backend
```bash
cd backend_protocall
npm run build
```

### Start Production Server
```bash
cd backend_protocall
npm start
```

---

## 🔧 Troubleshooting

### Common Issues

**1. MySQL Connection Error**
```
Error: Access denied for user 'root'@'localhost'
```
Solution: Check your `.env` file credentials match your MySQL setup.

**2. Port Already in Use**
```
Error: EADDRINUSE: address already in use :::5000
```
Solution: Kill the process using the port or change the PORT in `.env`.

**3. WebSocket Connection Failed**
```
WebSocket connection to 'ws://localhost:5001' failed
```
Solution: Ensure the backend server is running and WS_PORT matches.

**4. CORS Error**
```
Access-Control-Allow-Origin error
```
Solution: Verify FRONTEND_URL in backend `.env` matches your frontend URL.

---

## 📄 License

MIT License - see LICENSE file for details.

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📞 Support

For support and questions:
- Open an issue on GitHub
- Contact: support@example.com
