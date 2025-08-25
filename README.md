# Yapper - Real-time Chat & Video Call App

A modern, full-stack real-time chatting application with video call functionality, built with React, Node.js, Socket.IO, and WebRTC.

## 🚀 Features

- **Real-time Chat**: Instant messaging with Socket.IO
- **Video Calls**: Peer-to-peer video calls using WebRTC
- **Friend System**: Send, accept, and manage friend requests
- **User Authentication**: Secure JWT-based authentication
- **Mobile Responsive**: Works perfectly on mobile devices
- **Modern UI**: Beautiful interface with Tailwind CSS
- **File Uploads**: Avatar uploads and message attachments
- **Online Status**: Real-time online/offline indicators

## 🛠️ Tech Stack

### Frontend
- **React** with TypeScript
- **Tailwind CSS** for styling
- **Socket.IO Client** for real-time communication
- **WebRTC** for video calls
- **React Router** for navigation
- **React Hook Form** for form handling
- **React Hot Toast** for notifications

### Backend
- **Node.js** with Express
- **Socket.IO** for real-time features
- **MongoDB** with Mongoose
- **JWT** for authentication
- **bcryptjs** for password hashing
- **Multer** for file uploads

## 📦 Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/YOUR_USERNAME/yapper-chat-app.git
   cd yapper-chat-app
   ```

2. **Install dependencies**
   ```bash
   npm run install-all
   ```

3. **Set up environment variables**
   ```bash
   cp env.example .env
   ```
   Edit `.env` with your MongoDB URI and other settings.

4. **Start development servers**
   ```bash
   npm run dev
   ```

## 🌐 Deployment

### Railway (Recommended)
1. Connect your GitHub repository to Railway
2. Add environment variables in Railway dashboard
3. Deploy automatically

### Vercel
1. Push to GitHub
2. Connect repository to Vercel
3. Configure environment variables
4. Deploy

## 🔧 Environment Variables

```env
PORT=5002
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
JWT_EXPIRE=30d
NODE_ENV=development
MAX_FILE_SIZE=5242880
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

## 📱 Usage

1. **Register/Login**: Create an account or sign in
2. **Add Friends**: Search and send friend requests
3. **Start Chatting**: Click on friends to start conversations
4. **Video Calls**: Use the video call button for face-to-face chats
5. **Manage Profile**: Update your avatar and profile information

## 🎯 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user

### Users
- `GET /api/users/search` - Search users
- `PUT /api/users/profile` - Update profile
- `PUT /api/users/avatar` - Upload avatar

### Friends
- `POST /api/friends/request` - Send friend request
- `GET /api/friends/list` - Get friends list
- `GET /api/friends/requests` - Get pending requests
- `PUT /api/friends/request/:id` - Accept/reject request

### Messages
- `GET /api/messages/:userId` - Get chat history
- `POST /api/messages` - Send message

## 🔒 Security Features

- JWT authentication
- Password hashing with bcrypt
- Rate limiting
- CORS protection
- Input validation
- File upload restrictions

## 📄 License

MIT License - feel free to use this project for your own applications!

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📞 Support

If you have any questions or issues, please open an issue on GitHub.

---

**Built with ❤️ using modern web technologies**
