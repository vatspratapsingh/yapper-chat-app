const express = require('express');
const Message = require('../models/Message');
const User = require('../models/User');
const { auth } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/messages/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024 // 10MB
  }
});

// @route   POST /api/messages
// @desc    Send a message
// @access  Private
router.post('/', auth, async (req, res) => {
  try {
    const { receiverId, content, messageType = 'text', replyTo } = req.body;

    if (!receiverId || !content) {
      return res.status(400).json({ message: 'Receiver ID and content are required' });
    }

    // Check if receiver exists and is not blocked
    const receiver = await User.findById(receiverId);
    if (!receiver) {
      return res.status(404).json({ message: 'Receiver not found' });
    }

    if (req.user.blockedUsers.includes(receiverId)) {
      return res.status(403).json({ message: 'Cannot send message to blocked user' });
    }

    // Check if they are friends (optional - you can remove this if you want to allow messages to anyone)
    if (!req.user.friends.includes(receiverId)) {
      return res.status(403).json({ message: 'Can only send messages to friends' });
    }

    const messageData = {
      sender: req.user._id,
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

    res.status(201).json({ message: message });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/messages/file
// @desc    Send a file message
// @access  Private
router.post('/file', auth, upload.single('file'), async (req, res) => {
  try {
    const { receiverId, messageType = 'file', replyTo } = req.body;

    if (!receiverId || !req.file) {
      return res.status(400).json({ message: 'Receiver ID and file are required' });
    }

    // Check if receiver exists and is not blocked
    const receiver = await User.findById(receiverId);
    if (!receiver) {
      return res.status(404).json({ message: 'Receiver not found' });
    }

    if (req.user.blockedUsers.includes(receiverId)) {
      return res.status(403).json({ message: 'Cannot send message to blocked user' });
    }

    // Check if they are friends
    if (!req.user.friends.includes(receiverId)) {
      return res.status(403).json({ message: 'Can only send messages to friends' });
    }

    const fileUrl = `/uploads/messages/${req.file.filename}`;
    
    const messageData = {
      sender: req.user._id,
      receiver: receiverId,
      content: req.file.originalname,
      messageType,
      fileUrl,
      fileName: req.file.originalname,
      fileSize: req.file.size
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

    res.status(201).json({ message: message });
  } catch (error) {
    console.error('Send file message error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/messages/:userId
// @desc    Get conversation with a user
// @access  Private
router.get('/:userId', auth, async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 50, skip = 0 } = req.query;

    // Check if user exists and is not blocked
    const otherUser = await User.findById(userId);
    if (!otherUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (req.user.blockedUsers.includes(userId)) {
      return res.status(403).json({ message: 'Cannot access messages from blocked user' });
    }

    const messages = await Message.getConversation(
      req.user._id,
      userId,
      parseInt(limit),
      parseInt(skip)
    );

    res.json({ messages: messages.reverse() }); // Reverse to get chronological order
  } catch (error) {
    console.error('Get conversation error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/messages/:messageId/read
// @desc    Mark message as read
// @access  Private
router.put('/:messageId/read', auth, async (req, res) => {
  try {
    const { messageId } = req.params;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    // Only mark as read if user is the receiver
    if (message.receiver.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    await message.markAsRead();

    res.json({ message: 'Message marked as read' });
  } catch (error) {
    console.error('Mark message as read error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/messages/:messageId
// @desc    Edit message
// @access  Private
router.put('/:messageId', auth, async (req, res) => {
  try {
    const { messageId } = req.params;
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({ message: 'Content is required' });
    }

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    // Only allow sender to edit
    if (message.sender.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Only allow editing text messages
    if (message.messageType !== 'text') {
      return res.status(400).json({ message: 'Only text messages can be edited' });
    }

    await message.editMessage(content);

    res.json({ message: 'Message edited successfully' });
  } catch (error) {
    console.error('Edit message error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/messages/:messageId
// @desc    Delete message
// @access  Private
router.delete('/:messageId', auth, async (req, res) => {
  try {
    const { messageId } = req.params;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    // Only allow sender to delete
    if (message.sender.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    await message.deleteForUser(req.user._id);

    res.json({ message: 'Message deleted successfully' });
  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/messages/:messageId/reaction
// @desc    Add reaction to message
// @access  Private
router.post('/:messageId/reaction', auth, async (req, res) => {
  try {
    const { messageId } = req.params;
    const { emoji } = req.body;

    if (!emoji) {
      return res.status(400).json({ message: 'Emoji is required' });
    }

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    await message.addReaction(req.user._id, emoji);

    res.json({ message: 'Reaction added successfully' });
  } catch (error) {
    console.error('Add reaction error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/messages/:messageId/reaction
// @desc    Remove reaction from message
// @access  Private
router.delete('/:messageId/reaction', auth, async (req, res) => {
  try {
    const { messageId } = req.params;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    await message.removeReaction(req.user._id);

    res.json({ message: 'Reaction removed successfully' });
  } catch (error) {
    console.error('Remove reaction error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/messages/unread/count
// @desc    Get unread message count
// @access  Private
router.get('/unread/count', auth, async (req, res) => {
  try {
    const count = await Message.getUnreadCount(req.user._id);
    res.json({ count });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
