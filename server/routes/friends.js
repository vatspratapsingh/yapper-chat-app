const express = require('express');
const User = require('../models/User');
const { auth } = require('../middleware/auth');

const router = express.Router();

// @route   POST /api/friends/request
// @desc    Send friend request
// @access  Private
router.post('/request', auth, async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }

    if (userId === req.user._id.toString()) {
      return res.status(400).json({ message: 'Cannot send friend request to yourself' });
    }

    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if already friends
    if (req.user.friends.includes(userId)) {
      return res.status(400).json({ message: 'Already friends with this user' });
    }

    // Check if already friends
    if (req.user.friends.includes(userId)) {
      return res.status(400).json({ message: 'Already friends with this user' });
    }

    // Check if request already exists (checking in target user's requests)
    const existingRequest = targetUser.friendRequests.find(
      request => request.from.toString() === req.user._id.toString()
    );

    if (existingRequest) {
      if (existingRequest.status === 'pending') {
        return res.status(400).json({ message: 'Friend request already pending' });
      } else if (existingRequest.status === 'accepted') {
        return res.status(400).json({ message: 'Already friends with this user' });
      }
    }

    // Add friend request to target user
    targetUser.friendRequests.push({
      from: req.user._id,
      status: 'pending'
    });

    await targetUser.save();

    // Emit socket event for real-time notification
    const { connectedUsers } = require('../socket/socketHandlers');
    const targetUserSocket = connectedUsers.get(userId);
    if (targetUserSocket) {
      const io = req.app.get('io');
      io.to(targetUserSocket.socketId).emit('new_friend_request', {
        from: req.user.getPublicProfile(),
        message: `${req.user.fullName} sent you a friend request`
      });
    }

    res.json({ message: 'Friend request sent successfully' });
  } catch (error) {
    console.error('Send friend request error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/friends/request/:requestId
// @desc    Accept or reject friend request
// @access  Private
router.put('/request/:requestId', auth, async (req, res) => {
  try {
    const { requestId } = req.params;
    const { action } = req.body; // 'accept' or 'reject'

    if (!['accept', 'reject'].includes(action)) {
      return res.status(400).json({ message: 'Invalid action' });
    }

    const user = await User.findById(req.user._id);
    const request = user.friendRequests.id(requestId);

    if (!request) {
      return res.status(404).json({ message: 'Friend request not found' });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ message: 'Friend request already processed' });
    }

    const requesterId = request.from;

    if (action === 'accept') {
      // Add to friends list for both users
      if (!user.friends.includes(requesterId)) {
        user.friends.push(requesterId);
      }

      const requester = await User.findById(requesterId);
      if (!requester.friends.includes(user._id)) {
        requester.friends.push(user._id);
      }

      // Update request status
      request.status = 'accepted';
      await requester.save();
    } else {
      // Reject request
      request.status = 'rejected';
    }

    await user.save();

    res.json({ 
      message: `Friend request ${action}ed successfully`,
      action
    });
  } catch (error) {
    console.error('Process friend request error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/friends/:friendId
// @desc    Remove friend
// @access  Private
router.delete('/:friendId', auth, async (req, res) => {
  try {
    const { friendId } = req.params;

    const user = await User.findById(req.user._id);
    const friend = await User.findById(friendId);

    if (!friend) {
      return res.status(404).json({ message: 'Friend not found' });
    }

    // Remove from friends list for both users
    user.friends = user.friends.filter(id => id.toString() !== friendId);
    friend.friends = friend.friends.filter(id => id.toString() !== req.user._id.toString());

    await Promise.all([user.save(), friend.save()]);

    res.json({ message: 'Friend removed successfully' });
  } catch (error) {
    console.error('Remove friend error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/friends/requests
// @desc    Get pending friend requests
// @access  Private
router.get('/requests', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate({
        path: 'friendRequests.from',
        select: 'username firstName lastName avatar'
      });

    const pendingRequests = user.friendRequests
      .filter(request => request.status === 'pending')
      .map(request => ({
        _id: request._id,
        from: request.from,
        createdAt: request.createdAt
      }));

    res.json({ requests: pendingRequests });
  } catch (error) {
    console.error('Get friend requests error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/friends/list
// @desc    Get friends list
// @access  Private
router.get('/list', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate({
        path: 'friends',
        select: 'username firstName lastName avatar status lastSeen'
      });

    res.json({ friends: user.friends });
  } catch (error) {
    console.error('Get friends list error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/friends/block/:userId
// @desc    Block user
// @access  Private
router.post('/block/:userId', auth, async (req, res) => {
  try {
    const { userId } = req.params;

    if (userId === req.user._id.toString()) {
      return res.status(400).json({ message: 'Cannot block yourself' });
    }

    const user = await User.findById(req.user._id);
    const targetUser = await User.findById(userId);

    if (!targetUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Add to blocked users
    if (!user.blockedUsers.includes(userId)) {
      user.blockedUsers.push(userId);
    }

    // Remove from friends if they were friends
    user.friends = user.friends.filter(id => id.toString() !== userId);
    targetUser.friends = targetUser.friends.filter(id => id.toString() !== req.user._id.toString());

    // Remove friend requests
    user.friendRequests = user.friendRequests.filter(
      request => request.from.toString() !== userId
    );
    targetUser.friendRequests = targetUser.friendRequests.filter(
      request => request.from.toString() !== req.user._id.toString()
    );

    await Promise.all([user.save(), targetUser.save()]);

    res.json({ message: 'User blocked successfully' });
  } catch (error) {
    console.error('Block user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/friends/block/:userId
// @desc    Unblock user
// @access  Private
router.delete('/block/:userId', auth, async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(req.user._id);
    user.blockedUsers = user.blockedUsers.filter(id => id.toString() !== userId);

    await user.save();

    res.json({ message: 'User unblocked successfully' });
  } catch (error) {
    console.error('Unblock user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/friends/blocked
// @desc    Get blocked users
// @access  Private
router.get('/blocked', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate({
        path: 'blockedUsers',
        select: 'username firstName lastName avatar'
      });

    res.json({ blockedUsers: user.blockedUsers });
  } catch (error) {
    console.error('Get blocked users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
