const express = require('express');
const User = require('../models/User');
const { auth } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/users/search
// @desc    Search users by username or name
// @access  Private
router.get('/search', auth, async (req, res) => {
  try {
    const { q, limit = 10 } = req.query;
    
    if (!q || q.trim().length < 2) {
      return res.status(400).json({ message: 'Search query must be at least 2 characters' });
    }

    const searchRegex = new RegExp(q.trim(), 'i');
    
    const users = await User.find({
      $and: [
        {
          $or: [
            { username: searchRegex },
            { firstName: searchRegex },
            { lastName: searchRegex }
          ]
        },
        { _id: { $ne: req.user._id } }, // Exclude current user
        { _id: { $nin: req.user.blockedUsers } } // Exclude blocked users
      ]
    })
    .select('username firstName lastName avatar status lastSeen')
    .limit(parseInt(limit))
    .lean();

    // Add friendship status to each user
    const usersWithStatus = users.map(user => {
      const isFriend = req.user.friends.includes(user._id);
      const hasPendingRequest = req.user.friendRequests.some(
        request => request.from.toString() === user._id.toString() && request.status === 'pending'
      );
      const hasSentRequest = req.user.friendRequests.some(
        request => request.from.toString() === req.user._id.toString() && request.status === 'pending'
      );

      return {
        ...user,
        relationship: isFriend ? 'friend' : 
                     hasPendingRequest ? 'pending_received' : 
                     hasSentRequest ? 'pending_sent' : 'none'
      };
    });

    res.json({ users: usersWithStatus });
  } catch (error) {
    console.error('User search error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/users/:userId
// @desc    Get user profile by ID
// @access  Private
router.get('/:userId', auth, async (req, res) => {
  try {
    const { userId } = req.params;

    // Check if user is blocked
    if (req.user.blockedUsers.includes(userId)) {
      return res.status(404).json({ message: 'User not found' });
    }

    const user = await User.findById(userId)
      .select('username firstName lastName avatar bio status lastSeen createdAt')
      .lean();

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check friendship status
    const isFriend = req.user.friends.includes(userId);
    const hasPendingRequest = req.user.friendRequests.some(
      request => request.from.toString() === userId.toString() && request.status === 'pending'
    );
    const hasSentRequest = req.user.friendRequests.some(
      request => request.from.toString() === req.user._id.toString() && request.status === 'pending'
    );

    const userProfile = {
      ...user,
      relationship: isFriend ? 'friend' : 
                   hasPendingRequest ? 'pending_received' : 
                   hasSentRequest ? 'pending_sent' : 'none'
    };

    res.json({ user: userProfile });
  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/users/online
// @desc    Get online friends
// @access  Private
router.get('/online/friends', auth, async (req, res) => {
  try {
    const onlineFriends = await User.find({
      _id: { $in: req.user.friends },
      status: 'online'
    })
    .select('username firstName lastName avatar status lastSeen')
    .lean();

    res.json({ friends: onlineFriends });
  } catch (error) {
    console.error('Get online friends error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/users/status
// @desc    Update user status
// @access  Private
router.put('/status', auth, async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!['online', 'offline', 'away', 'busy'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { 
        status,
        lastSeen: status === 'offline' ? new Date() : req.user.lastSeen
      },
      { new: true }
    ).select('-password');

    res.json({
      message: 'Status updated successfully',
      user: user.getPublicProfile()
    });
  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/users/suggestions
// @desc    Get friend suggestions
// @access  Private
router.get('/suggestions/friends', auth, async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    // Get friends of friends who are not already friends or have pending requests
    const friendsOfFriends = await User.aggregate([
      {
        $match: {
          _id: { $in: req.user.friends }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'friends',
          foreignField: '_id',
          as: 'friendsOfFriends'
        }
      },
      {
        $unwind: '$friendsOfFriends'
      },
      {
        $match: {
          $and: [
            { 'friendsOfFriends._id': { $ne: req.user._id } },
            { 'friendsOfFriends._id': { $nin: req.user.friends } },
            { 'friendsOfFriends._id': { $nin: req.user.blockedUsers } },
            {
              $not: {
                $in: [
                  'friendsOfFriends._id',
                  req.user.friendRequests
                    .filter(req => req.status === 'pending')
                    .map(req => req.from)
                ]
              }
            }
          ]
        }
      },
      {
        $group: {
          _id: '$friendsOfFriends._id',
          user: { $first: '$friendsOfFriends' },
          mutualFriends: { $sum: 1 }
        }
      },
      {
        $sort: { mutualFriends: -1 }
      },
      {
        $limit: parseInt(limit)
      }
    ]);

    const suggestions = friendsOfFriends.map(item => ({
      ...item.user,
      mutualFriends: item.mutualFriends
    }));

    res.json({ suggestions });
  } catch (error) {
    console.error('Get friend suggestions error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
