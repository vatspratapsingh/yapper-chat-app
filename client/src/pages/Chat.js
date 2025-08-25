import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import axios from 'axios';
import { 
  FiArrowLeft, 
  FiPhone, 
  FiSend, 
  FiPaperclip, 
  FiSmile,
  FiMoreVertical
} from 'react-icons/fi';

const Chat = () => {
  const { userId } = useParams();
  const { user } = useAuth();
  const { 
    sendMessage, 
    startTyping, 
    stopTyping, 
    markMessageAsRead,
    startCall,
    typingUsers
  } = useSocket();
  const navigate = useNavigate();

  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [otherUser, setOtherUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    fetchUserAndMessages();
  }, [userId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Listen for new messages
    const handleNewMessage = (event) => {
      const { message } = event.detail;
      if (message.sender._id === userId || message.receiver._id === userId) {
        setMessages(prev => [...prev, message]);
        markMessageAsRead(message._id);
      }
    };

    const handleMessageSent = (event) => {
      const { message } = event.detail;
      setMessages(prev => prev.map(msg => 
        msg._id === message._id ? message : msg
      ));
      setSending(false);
    };

    window.addEventListener('new_message', handleNewMessage);
    window.addEventListener('message_sent', handleMessageSent);

    return () => {
      window.removeEventListener('new_message', handleNewMessage);
      window.removeEventListener('message_sent', handleMessageSent);
    };
  }, [userId, markMessageAsRead]);

  const fetchUserAndMessages = async () => {
    try {
      const [userResponse, messagesResponse] = await Promise.all([
        axios.get(`/api/users/${userId}`),
        axios.get(`/api/messages/${userId}`)
      ]);

      setOtherUser(userResponse.data.user);
      setMessages(messagesResponse.data.messages);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    setSending(true);
    sendMessage(userId, newMessage.trim());
    setNewMessage('');
    stopTyping(userId);
  };

  const handleTyping = (e) => {
    setNewMessage(e.target.value);
    if (e.target.value.trim()) {
      startTyping(userId);
    } else {
      stopTyping(userId);
    }
  };

  const handleVideoCall = () => {
    startCall(userId, 'video');
  };

  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const isTyping = typingUsers.has(userId);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  if (!otherUser) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-gray-500">User not found</p>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Chat with {otherUser.fullName} - Yapper</title>
      </Helmet>

      <div className="flex flex-col h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => navigate('/dashboard')}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                <FiArrowLeft size={20} />
              </button>
              <div className="flex items-center space-x-3">
                <img
                  src={otherUser.avatar || '/default-avatar.png'}
                  alt={otherUser.fullName}
                  className="w-10 h-10 rounded-full object-cover"
                />
                <div>
                  <h2 className="font-semibold text-gray-900">{otherUser.fullName}</h2>
                  <p className="text-sm text-gray-500">
                    {otherUser.status === 'online' ? 'Online' : 'Offline'}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleVideoCall}
                className="p-2 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg"
                title="Video call"
              >
                <FiPhone size={20} />
              </button>
              <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg">
                <FiMoreVertical size={20} />
              </button>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
            <div
              key={message._id}
              className={`flex ${message.sender._id === user._id ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-xs lg:max-w-md ${message.sender._id === user._id ? 'message-sent' : 'message-received'}`}>
                <div className="message-bubble">
                  <p className="text-sm">{message.content}</p>
                  <p className="text-xs opacity-70 mt-1">
                    {formatTime(message.createdAt)}
                    {message.sender._id === user._id && (
                      <span className="ml-2">
                        {message.isRead ? '✓✓' : '✓'}
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </div>
          ))}
          
          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-gray-200 rounded-lg px-4 py-2">
                <div className="typing-indicator">
                  <div className="typing-dot"></div>
                  <div className="typing-dot"></div>
                  <div className="typing-dot"></div>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input */}
        <div className="bg-white border-t border-gray-200 p-4">
          <form onSubmit={handleSendMessage} className="flex items-center space-x-2">
            <button
              type="button"
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
            >
              <FiPaperclip size={20} />
            </button>
            <button
              type="button"
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
            >
              <FiSmile size={20} />
            </button>
            <input
              type="text"
              value={newMessage}
              onChange={handleTyping}
              placeholder="Type a message..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              disabled={sending}
            />
            <button
              type="submit"
              disabled={!newMessage.trim() || sending}
              className="p-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FiSend size={20} />
            </button>
          </form>
        </div>
      </div>
    </>
  );
};

export default Chat;
