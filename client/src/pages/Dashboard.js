import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import axios from 'axios';
import { 
  FiSearch, 
  FiMessageCircle, 
  FiPhone, 
  FiLogOut, 
  FiSettings,
  FiPlus,
  FiMoreVertical
} from 'react-icons/fi';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const { isConnected, startCall } = useSocket();
  const navigate = useNavigate();
  
  const [friends, setFriends] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredFriends, setFilteredFriends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFriend, setSelectedFriend] = useState(null);

  useEffect(() => {
    fetchFriends();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredFriends(friends);
    } else {
      const filtered = friends.filter(friend =>
        friend.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        friend.username.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredFriends(filtered);
    }
  }, [searchQuery, friends]);

  const fetchFriends = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setLoading(false);
        return;
      }
      
      const response = await axios.get('/api/friends/list', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      setFriends(response.data.friends || []);
    } catch (error) {
      console.error('Error fetching friends:', error);
      // Don't show error if user is not authenticated
      if (error.response?.status !== 401) {
        console.error('Failed to fetch friends');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleFriendClick = (friend) => {
    setSelectedFriend(friend);
    navigate(`/chat/${friend._id}`);
  };

  const handleVideoCall = (friend) => {
    startCall(friend._id, 'video');
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'online':
        return 'bg-green-500';
      case 'away':
        return 'bg-yellow-500';
      case 'busy':
        return 'bg-red-500';
      default:
        return 'bg-gray-400';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Dashboard - Yapper</title>
      </Helmet>

      <div className="flex h-screen bg-gray-50">
        {/* Sidebar */}
        <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <img
                    src={user?.avatar || '/default-avatar.png'}
                    alt="Profile"
                    className="w-10 h-10 rounded-full object-cover"
                  />
                  <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${getStatusColor(user?.status)}`}></div>
                </div>
                <div>
                  <h2 className="font-semibold text-gray-900">{user?.fullName}</h2>
                  <p className="text-sm text-gray-500">{user?.status}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => navigate('/profile')}
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
                >
                  <FiSettings size={18} />
                </button>
                <button
                  onClick={handleLogout}
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
                >
                  <FiLogOut size={18} />
                </button>
              </div>
            </div>
          </div>

          {/* Search */}
          <div className="p-4 border-b border-gray-200">
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Search friends..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Friends List */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Friends</h3>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => navigate('/friends/add')}
                    className="relative p-2 text-primary-600 hover:bg-primary-50 rounded-lg"
                  >
                    <FiPlus size={18} />
                    {/* Add notification badge for pending requests */}
                  </button>
                </div>
              </div>

              {filteredFriends.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">No friends found</p>
                  <button
                    onClick={() => navigate('/friends/add')}
                    className="mt-2 text-primary-600 hover:text-primary-700"
                  >
                    Add friends
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredFriends.map((friend) => (
                    <div
                      key={friend._id}
                      className={`p-3 rounded-lg cursor-pointer transition-colors ${
                        selectedFriend?._id === friend._id
                          ? 'bg-primary-50 border border-primary-200'
                          : 'hover:bg-gray-50'
                      }`}
                      onClick={() => handleFriendClick(friend)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="relative">
                            <img
                              src={friend.avatar || '/default-avatar.png'}
                              alt={friend.fullName}
                              className="w-10 h-10 rounded-full object-cover"
                            />
                            <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${getStatusColor(friend.status)}`}></div>
                          </div>
                          <div>
                            <h4 className="font-medium text-gray-900">{friend.fullName}</h4>
                            <p className="text-sm text-gray-500">{friend.status}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleVideoCall(friend);
                            }}
                            className="p-2 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg"
                            title="Video call"
                          >
                            <FiPhone size={16} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              // Handle more options
                            }}
                            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
                          >
                            <FiMoreVertical size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Connection Status */}
          <div className="p-4 border-t border-gray-200">
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="text-sm text-gray-500">
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-24 h-24 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FiMessageCircle size={32} className="text-primary-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Welcome to Yapper
            </h3>
            <p className="text-gray-500 mb-6">
              Select a friend from the sidebar to start chatting
            </p>
            <button
              onClick={() => navigate('/friends/add')}
              className="btn-primary"
            >
              Add Friends
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default Dashboard;
