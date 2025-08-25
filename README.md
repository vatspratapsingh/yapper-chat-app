# Yapper - Real-time Chat & Video Calls

A modern, full-stack real-time chat application with video calls, friend requests, and mobile-responsive design.

## Features

### 🚀 Core Features
- **Real-time Messaging**: Instant message delivery with Socket.IO
- **Video Calls**: WebRTC-powered peer-to-peer video calls
- **Friend System**: Send, accept, and manage friend requests
- **User Profiles**: Customizable profiles with avatars and status
- **Mobile Responsive**: Works seamlessly on desktop and mobile devices

### 💬 Chat Features
- Real-time message delivery
- Typing indicators
- Read receipts
- Message reactions
- File sharing (images, documents)
- Message editing and deletion
- Reply to messages
- Emoji support

### 📹 Video Call Features
- One-on-one video calls
- Audio/video controls
- Screen sharing capability
- Call notifications
- Call history

### 👥 Social Features
- Friend requests and management
- User search and discovery
- Online/offline status
- Friend suggestions
- User blocking

### 🎨 UI/UX Features
- Modern, responsive design
- Dark/light theme support
- Real-time notifications
- Loading states and animations
- Mobile-first approach

## Tech Stack

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **Socket.IO** - Real-time communication
- **MongoDB** - Database
- **Mongoose** - ODM
- **JWT** - Authentication
- **bcryptjs** - Password hashing
- **Multer** - File uploads

### Frontend
- **React** - UI library
- **React Router** - Navigation
- **Socket.IO Client** - Real-time communication
- **Tailwind CSS** - Styling
- **React Hook Form** - Form management
- **React Hot Toast** - Notifications
- **Framer Motion** - Animations
- **WebRTC** - Video calls

## Prerequisites

Before running this application, make sure you have the following installed:

- **Node.js** (v14 or higher)
- **npm** or **yarn**
- **MongoDB** (local installation or MongoDB Atlas)

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Yapper
   ```

2. **Install dependencies**
   ```bash
   # Install server dependencies
   npm install
   
   # Install client dependencies
   cd client
   npm install
   cd ..
   ```

3. **Environment Setup**
   ```bash
   # Copy environment example
   cp env.example .env
   
   # Edit .env file with your configuration
   nano .env
   ```

4. **Environment Variables**
   ```env
   # Server Configuration
   PORT=5000
   NODE_ENV=development
   
   # MongoDB Configuration
   MONGODB_URI=mongodb://localhost:27017/yapper
   
   # JWT Configuration
   JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
   JWT_EXPIRE=7d
   
   # File Upload Configuration
   MAX_FILE_SIZE=5242880
   UPLOAD_PATH=./uploads
   
   # Rate Limiting
   RATE_LIMIT_WINDOW_MS=900000
   RATE_LIMIT_MAX_REQUESTS=100
   ```

5. **Create upload directories**
   ```bash
   mkdir -p uploads/avatars uploads/messages
   ```

## Running the Application

### Development Mode

1. **Start the server**
   ```bash
   npm run server
   ```

2. **Start the client** (in a new terminal)
   ```bash
   npm run client
   ```

3. **Or run both simultaneously**
   ```bash
   npm run dev
   ```

### Production Mode

1. **Build the client**
   ```bash
   npm run build
   ```

2. **Start the server**
   ```bash
   npm start
   ```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/me` - Get current user profile
- `PUT /api/auth/profile` - Update user profile
- `POST /api/auth/avatar` - Upload avatar
- `POST /api/auth/change-password` - Change password

### Users
- `GET /api/users/search` - Search users
- `GET /api/users/:userId` - Get user profile
- `GET /api/users/online/friends` - Get online friends
- `PUT /api/users/status` - Update user status
- `GET /api/users/suggestions/friends` - Get friend suggestions

### Friends
- `POST /api/friends/request` - Send friend request
- `PUT /api/friends/request/:requestId` - Accept/reject friend request
- `DELETE /api/friends/:friendId` - Remove friend
- `GET /api/friends/requests` - Get pending requests
- `GET /api/friends/list` - Get friends list
- `POST /api/friends/block/:userId` - Block user
- `DELETE /api/friends/block/:userId` - Unblock user
- `GET /api/friends/blocked` - Get blocked users

### Messages
- `POST /api/messages` - Send message
- `POST /api/messages/file` - Send file message
- `GET /api/messages/:userId` - Get conversation
- `PUT /api/messages/:messageId/read` - Mark as read
- `PUT /api/messages/:messageId` - Edit message
- `DELETE /api/messages/:messageId` - Delete message
- `POST /api/messages/:messageId/reaction` - Add reaction
- `DELETE /api/messages/:messageId/reaction` - Remove reaction
- `GET /api/messages/unread/count` - Get unread count

## Socket.IO Events

### Client to Server
- `send_message` - Send a message
- `typing_start` - Start typing indicator
- `typing_stop` - Stop typing indicator
- `mark_read` - Mark message as read
- `status_change` - Update user status
- `video_call_request` - Request video call
- `video_call_answer` - Answer video call
- `video_call_offer` - Send WebRTC offer
- `video_call_answer_sdp` - Send WebRTC answer
- `video_call_ice_candidate` - Send ICE candidate
- `video_call_end` - End video call

### Server to Client
- `new_message` - New message received
- `message_sent` - Message sent confirmation
- `user_typing` - User typing indicator
- `user_stopped_typing` - User stopped typing
- `message_read` - Message read receipt
- `friend_status_change` - Friend status update
- `incoming_call` - Incoming call notification
- `call_answered` - Call answered response
- `call_ended` - Call ended notification
- `call_offer` - WebRTC offer
- `call_answer_sdp` - WebRTC answer
- `ice_candidate` - ICE candidate

## Project Structure

```
Yapper/
├── server/                 # Backend server
│   ├── index.js           # Main server file
│   ├── models/            # Database models
│   │   ├── User.js
│   │   └── Message.js
│   ├── routes/            # API routes
│   │   ├── auth.js
│   │   ├── users.js
│   │   ├── friends.js
│   │   └── messages.js
│   ├── middleware/        # Middleware
│   │   └── auth.js
│   └── socket/            # Socket.IO handlers
│       └── socketHandlers.js
├── client/                # Frontend React app
│   ├── public/            # Public assets
│   ├── src/               # Source code
│   │   ├── components/    # React components
│   │   ├── contexts/      # React contexts
│   │   ├── pages/         # Page components
│   │   ├── hooks/         # Custom hooks
│   │   ├── utils/         # Utility functions
│   │   ├── App.js         # Main app component
│   │   └── index.js       # Entry point
│   ├── package.json       # Client dependencies
│   └── tailwind.config.js # Tailwind configuration
├── uploads/               # File uploads
│   ├── avatars/           # User avatars
│   └── messages/          # Message files
├── package.json           # Server dependencies
├── env.example            # Environment variables example
└── README.md              # Project documentation
```

## Mobile Support

The application is fully responsive and works on mobile devices with the following features:

- Touch-friendly interface
- Mobile-optimized video calls
- Responsive chat interface
- Mobile navigation
- Touch gestures support

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

If you encounter any issues or have questions, please:

1. Check the [Issues](https://github.com/yourusername/yapper/issues) page
2. Create a new issue with detailed information
3. Contact the maintainers

## Acknowledgments

- [Socket.IO](https://socket.io/) for real-time communication
- [WebRTC](https://webrtc.org/) for video calls
- [Tailwind CSS](https://tailwindcss.com/) for styling
- [React](https://reactjs.org/) for the UI framework
- [MongoDB](https://www.mongodb.com/) for the database

---

**Happy Chatting! 🚀**
