import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { 
  FiSearch, 
  FiUserPlus, 
  FiArrowLeft,
  FiUser
} from 'react-icons/fi';

const AddFriends = () => {
  const navigate = useNavigate();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pendingRequests, setPendingRequests] = useState([]);

  useEffect(() => {
    fetchPendingRequests();
  }, []);

  const fetchPendingRequests = async () => {
    try {
      const response = await axios.get('/api/friends/requests');
      setPendingRequests(response.data.requests || []);
    } catch (error) {
      console.error('Error fetching pending requests:', error);
    }
  };

  const searchUsers = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setLoading(true);
    try {
      const response = await axios.get(`/api/users/search?q=${encodeURIComponent(searchQuery)}`);
      setSearchResults(response.data.users || []);
    } catch (error) {
      console.error('Error searching users:', error);
      toast.error('Failed to search users');
    } finally {
      setLoading(false);
    }
  };

  const sendFriendRequest = async (userId) => {
    try {
      await axios.post('/api/friends/request', { userId });
      toast.success('Friend request sent!');
      // Remove from search results
      setSearchResults(prev => prev.filter(user => user._id !== userId));
    } catch (error) {
      console.error('Error sending friend request:', error);
      if (error.response?.status === 400) {
        toast.error(error.response.data.message || 'Failed to send friend request');
      } else {
        toast.error('Failed to send friend request');
      }
    }
  };

  const acceptFriendRequest = async (requestId) => {
    try {
      await axios.put(`/api/friends/request/${requestId}`, { action: 'accept' });
      toast.success('Friend request accepted!');
      fetchPendingRequests();
    } catch (error) {
      console.error('Error accepting friend request:', error);
      toast.error('Failed to accept friend request');
    }
  };

  const rejectFriendRequest = async (requestId) => {
    try {
      await axios.put(`/api/friends/request/${requestId}`, { action: 'reject' });
      toast.success('Friend request rejected');
      fetchPendingRequests();
    } catch (error) {
      console.error('Error rejecting friend request:', error);
      toast.error('Failed to reject friend request');
    }
  };

  return (
    <>
      <Helmet>
        <title>Add Friends - Yapper</title>
      </Helmet>

      <div className="flex h-screen bg-gray-50">
        {/* Sidebar */}
        <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => navigate('/dashboard')}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                <FiArrowLeft size={18} />
              </button>
              <div>
                <h2 className="font-semibold text-gray-900">Add Friends</h2>
                <p className="text-sm text-gray-500">Find and connect with people</p>
              </div>
            </div>
          </div>

          {/* Search */}
          <div className="p-4 border-b border-gray-200">
            <div className="space-y-3">
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="text"
                  placeholder="Search by username or name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && searchUsers()}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <button
                onClick={searchUsers}
                disabled={loading}
                className="w-full btn-primary"
              >
                {loading ? 'Searching...' : 'Search'}
              </button>
            </div>
          </div>

          {/* Search Results */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Search Results</h3>
              
              {searchResults.length === 0 && searchQuery && !loading ? (
                <p className="text-gray-500 text-center py-4">No users found</p>
              ) : (
                <div className="space-y-2">
                  {searchResults.map((user) => (
                    <div key={user._id} className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <img
                            src={user.avatar || '/default-avatar.png'}
                            alt={user.fullName}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                          <div>
                            <h4 className="font-medium text-gray-900">{user.fullName}</h4>
                            <p className="text-sm text-gray-500">@{user.username}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => sendFriendRequest(user._id)}
                          className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg"
                          title="Send friend request"
                        >
                          <FiUserPlus size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-6">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Friend Requests</h2>
            
            {pendingRequests.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FiUser size={24} className="text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No pending requests</h3>
                <p className="text-gray-500">When someone sends you a friend request, it will appear here</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingRequests.map((request) => (
                  <div key={request._id} className="p-4 bg-white rounded-lg border border-gray-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <img
                          src={request.from.avatar || '/default-avatar.png'}
                          alt={request.from.fullName}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                        <div>
                          <h4 className="font-medium text-gray-900">{request.from.fullName}</h4>
                          <p className="text-sm text-gray-500">@{request.from.username}</p>
                          <p className="text-xs text-gray-400">Sent {new Date(request.createdAt).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => acceptFriendRequest(request._id)}
                          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => rejectFriendRequest(request._id)}
                          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                        >
                          Decline
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default AddFriends;
