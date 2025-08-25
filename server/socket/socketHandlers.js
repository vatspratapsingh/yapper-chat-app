const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Message = require('../models/Message');

// Store connected users
const connectedUsers = new Map();
const videoCallRooms = new Map();

const setupSocketHandlers = (io) => {
  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication error'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId).select('-password');
      
      if (!user) {
        return next(new Error('User not found'));
      }

      socket.userId = user._id.toString();
      socket.user = user;
      next();
    } catch (error) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.user.username}`);

    // Add user to connected users
    connectedUsers.set(socket.userId, {
      socketId: socket.id,
      user: socket.user,
      status: 'online'
    });

    // Update user status to online
    User.findByIdAndUpdate(socket.userId, {
      status: 'online',
      lastSeen: new Date()
    }).exec();

    // Notify friends about online status
    socket.user.friends.forEach(friendId => {
      const friendSocket = connectedUsers.get(friendId.toString());
      if (friendSocket) {
        io.to(friendSocket.socketId).emit('friend_status_change', {
          userId: socket.userId,
          status: 'online'
        });
      }
    });

    // Join user to their personal room
    socket.join(socket.userId);

    // Handle private messages
    socket.on('send_message', async (data) => {
      try {
        const { receiverId, content, messageType = 'text', replyTo } = data;

        // Validate receiver
        const receiver = await User.findById(receiverId);
        if (!receiver) {
          socket.emit('error', { message: 'Receiver not found' });
          return;
        }

        // Check if they are friends
        if (!socket.user.friends.includes(receiverId)) {
          socket.emit('error', { message: 'Can only send messages to friends' });
          return;
        }

        // Create message
        const messageData = {
          sender: socket.userId,
          receiver: receiverId,
          content,
          messageType
        };

        if (replyTo) {
          const replyMessage = await Message.findById(replyTo);
          if (replyMessage) {
            messageData.replyTo = replyTo;
          }
        }

        const message = new Message(messageData);
        await message.save();

        // Populate sender and receiver info
        await message.populate('sender', 'username firstName lastName avatar');
        await message.populate('receiver', 'username firstName lastName avatar');
        if (message.replyTo) {
          await message.populate('replyTo', 'content sender');
        }

        // Send to receiver if online
        const receiverSocket = connectedUsers.get(receiverId);
        if (receiverSocket) {
          io.to(receiverSocket.socketId).emit('new_message', {
            message,
            sender: socket.user.getPublicProfile()
          });
        }

        // Send confirmation to sender
        socket.emit('message_sent', { message });

      } catch (error) {
        console.error('Send message error:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Handle typing indicators
    socket.on('typing_start', (data) => {
      const { receiverId } = data;
      const receiverSocket = connectedUsers.get(receiverId);
      if (receiverSocket) {
        io.to(receiverSocket.socketId).emit('user_typing', {
          userId: socket.userId,
          username: socket.user.username
        });
      }
    });

    socket.on('typing_stop', (data) => {
      const { receiverId } = data;
      const receiverSocket = connectedUsers.get(receiverId);
      if (receiverSocket) {
        io.to(receiverSocket.socketId).emit('user_stopped_typing', {
          userId: socket.userId
        });
      }
    });

    // Handle message read receipts
    socket.on('mark_read', async (data) => {
      try {
        const { messageId } = data;
        const message = await Message.findById(messageId);
        
        if (message && message.receiver.toString() === socket.userId) {
          await message.markAsRead();
          
          // Notify sender that message was read
          const senderSocket = connectedUsers.get(message.sender.toString());
          if (senderSocket) {
            io.to(senderSocket.socketId).emit('message_read', {
              messageId,
              readBy: socket.userId,
              readAt: new Date()
            });
          }
        }
      } catch (error) {
        console.error('Mark read error:', error);
      }
    });

    // Video call handlers
    socket.on('video_call_request', (data) => {
      const { receiverId, callType = 'video' } = data;
      const receiverSocket = connectedUsers.get(receiverId);
      
      if (receiverSocket) {
        io.to(receiverSocket.socketId).emit('incoming_call', {
          callerId: socket.userId,
          caller: socket.user.getPublicProfile(),
          callType
        });
      } else {
        socket.emit('call_failed', { message: 'User is offline' });
      }
    });

    socket.on('video_call_answer', (data) => {
      const { callerId, answer } = data;
      const callerSocket = connectedUsers.get(callerId);
      
      if (callerSocket) {
        io.to(callerSocket.socketId).emit('call_answered', {
          answererId: socket.userId,
          answer,
          answerer: socket.user.getPublicProfile()
        });
      }
    });

    socket.on('video_call_ice_candidate', (data) => {
      const { receiverId, candidate } = data;
      const receiverSocket = connectedUsers.get(receiverId);
      
      if (receiverSocket) {
        io.to(receiverSocket.socketId).emit('ice_candidate', {
          senderId: socket.userId,
          candidate
        });
      }
    });

    socket.on('video_call_offer', (data) => {
      const { receiverId, offer } = data;
      const receiverSocket = connectedUsers.get(receiverId);
      
      if (receiverSocket) {
        io.to(receiverSocket.socketId).emit('call_offer', {
          senderId: socket.userId,
          offer
        });
      }
    });

    socket.on('video_call_answer_sdp', (data) => {
      const { receiverId, answer } = data;
      const receiverSocket = connectedUsers.get(receiverId);
      
      if (receiverSocket) {
        io.to(receiverSocket.socketId).emit('call_answer_sdp', {
          senderId: socket.userId,
          answer
        });
      }
    });

    socket.on('video_call_end', (data) => {
      const { receiverId } = data;
      const receiverSocket = connectedUsers.get(receiverId);
      
      if (receiverSocket) {
        io.to(receiverSocket.socketId).emit('call_ended', {
          senderId: socket.userId
        });
      }
    });

    // Handle friend request notifications
    socket.on('friend_request_sent', async (data) => {
      try {
        const { receiverId } = data;
        const receiverSocket = connectedUsers.get(receiverId);
        
        if (receiverSocket) {
          io.to(receiverSocket.socketId).emit('new_friend_request', {
            from: socket.user.getPublicProfile(),
            message: `${socket.user.fullName} sent you a friend request`
          });
        }
      } catch (error) {
        console.error('Friend request notification error:', error);
      }
    });

    // Handle user status changes
    socket.on('status_change', async (data) => {
      try {
        const { status } = data;
        
        if (!['online', 'offline', 'away', 'busy'].includes(status)) {
          return;
        }

        // Update user status in database
        await User.findByIdAndUpdate(socket.userId, {
          status,
          lastSeen: status === 'offline' ? new Date() : socket.user.lastSeen
        });

        // Update in connected users
        const userData = connectedUsers.get(socket.userId);
        if (userData) {
          userData.status = status;
          connectedUsers.set(socket.userId, userData);
        }

        // Notify friends about status change
        socket.user.friends.forEach(friendId => {
          const friendSocket = connectedUsers.get(friendId.toString());
          if (friendSocket) {
            io.to(friendSocket.socketId).emit('friend_status_change', {
              userId: socket.userId,
              status
            });
          }
        });

      } catch (error) {
        console.error('Status change error:', error);
      }
    });

    // Handle disconnection
    socket.on('disconnect', async () => {
      console.log(`User disconnected: ${socket.user.username}`);

      // Remove from connected users
      connectedUsers.delete(socket.userId);

      // Update user status to offline
      await User.findByIdAndUpdate(socket.userId, {
        status: 'offline',
        lastSeen: new Date()
      });

      // Notify friends about offline status
      socket.user.friends.forEach(friendId => {
        const friendSocket = connectedUsers.get(friendId.toString());
        if (friendSocket) {
          io.to(friendSocket.socketId).emit('friend_status_change', {
            userId: socket.userId,
            status: 'offline'
          });
        }
      });
    });
  });
};

module.exports = { setupSocketHandlers, connectedUsers };
