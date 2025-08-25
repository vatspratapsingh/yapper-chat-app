import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';

const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const { user, token, isAuthenticated } = useAuth();
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [onlineFriends, setOnlineFriends] = useState([]);
  const [typingUsers, setTypingUsers] = useState(new Set());
  const [incomingCall, setIncomingCall] = useState(null);
  const [activeCall, setActiveCall] = useState(null);
  
  // WebRTC refs
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  useEffect(() => {
    if (isAuthenticated && token && user) {
      const newSocket = io(process.env.REACT_APP_SOCKET_URL || 'http://localhost:5002', {
        auth: { token },
        transports: ['websocket', 'polling'],
      });

      newSocket.on('connect', () => {
        console.log('Connected to server');
        setIsConnected(true);
      });

      newSocket.on('disconnect', () => {
        console.log('Disconnected from server');
        setIsConnected(false);
      });

      newSocket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
        toast.error('Connection error. Please refresh the page.');
      });

      // Friend status changes
      newSocket.on('friend_status_change', (data) => {
        setOnlineFriends(prev => {
          const updated = [...prev];
          const index = updated.findIndex(friend => friend._id === data.userId);
          
          if (index !== -1) {
            updated[index] = { ...updated[index], status: data.status };
          }
          
          return updated;
        });
      });

      // New message
      newSocket.on('new_message', (data) => {
        // This will be handled by the chat component
        // You can emit a custom event here if needed
        window.dispatchEvent(new CustomEvent('new_message', { detail: data }));
      });

      // Message sent confirmation
      newSocket.on('message_sent', (data) => {
        // Handle message sent confirmation
        window.dispatchEvent(new CustomEvent('message_sent', { detail: data }));
      });

      // Typing indicators
      newSocket.on('user_typing', (data) => {
        setTypingUsers(prev => new Set([...prev, data.userId]));
      });

      newSocket.on('user_stopped_typing', (data) => {
        setTypingUsers(prev => {
          const newSet = new Set(prev);
          newSet.delete(data.userId);
          return newSet;
        });
      });

      // Message read receipts
      newSocket.on('message_read', (data) => {
        window.dispatchEvent(new CustomEvent('message_read', { detail: data }));
      });

      // Video call events
      newSocket.on('incoming_call', (data) => {
        setIncomingCall(data);
        // Play ringtone or show notification
        toast.custom((t) => (
          <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} max-w-md w-full bg-white shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5`}>
            <div className="flex-1 w-0 p-4">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <img className="h-10 w-10 rounded-full" src={data.caller.avatar || '/default-avatar.png'} alt="" />
                </div>
                <div className="ml-3 flex-1">
                  <p className="text-sm font-medium text-gray-900">
                    Incoming {data.callType} call
                  </p>
                  <p className="mt-1 text-sm text-gray-500">
                    {data.caller.fullName}
                  </p>
                </div>
              </div>
              <div className="mt-4 flex space-x-2">
                <button
                  onClick={() => {
                    acceptCall(data);
                    toast.dismiss(t.id);
                  }}
                  className="bg-green-600 text-white px-3 py-1 rounded text-sm"
                >
                  Accept
                </button>
                <button
                  onClick={() => {
                    rejectCall(data.callerId);
                    toast.dismiss(t.id);
                  }}
                  className="bg-red-600 text-white px-3 py-1 rounded text-sm"
                >
                  Decline
                </button>
              </div>
            </div>
          </div>
        ), { duration: 30000 });
      });

      newSocket.on('call_answered', (data) => {
        if (data.answer === 'accepted') {
          setActiveCall({
            type: 'outgoing',
            participant: data.answerer,
            status: 'connected'
          });
          initializeVideoCall();
        } else {
          setActiveCall(null);
          toast.error('Call was declined');
        }
      });

      newSocket.on('call_ended', (data) => {
        endCall();
        toast.info('Call ended');
      });

      // Friend request notifications
      newSocket.on('new_friend_request', (data) => {
        toast.success(`New friend request from ${data.from.fullName}!`);
        // You can also update the pending requests count here
      });

      // WebRTC signaling
      newSocket.on('call_offer', async (data) => {
        if (peerConnectionRef.current) {
          try {
            await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(data.offer));
            const answer = await peerConnectionRef.current.createAnswer();
            await peerConnectionRef.current.setLocalDescription(answer);
            
            newSocket.emit('video_call_answer_sdp', {
              receiverId: data.senderId,
              answer: answer
            });
          } catch (error) {
            console.error('Error handling call offer:', error);
          }
        }
      });

      newSocket.on('call_answer_sdp', async (data) => {
        if (peerConnectionRef.current) {
          try {
            await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(data.answer));
          } catch (error) {
            console.error('Error handling call answer:', error);
          }
        }
      });

      newSocket.on('ice_candidate', async (data) => {
        if (peerConnectionRef.current) {
          try {
            await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
          } catch (error) {
            console.error('Error adding ICE candidate:', error);
          }
        }
      });

      setSocket(newSocket);

      return () => {
        newSocket.close();
      };
    }
  }, [isAuthenticated, token, user]);

  // Initialize video call
  const initializeVideoCall = async () => {
    try {
      // Get user media
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });

      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // Create peer connection
      const configuration = {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      };

      const peerConnection = new RTCPeerConnection(configuration);
      peerConnectionRef.current = peerConnection;

      // Add local stream
      stream.getTracks().forEach(track => {
        peerConnection.addTrack(track, stream);
      });

      // Handle remote stream
      peerConnection.ontrack = (event) => {
        remoteStreamRef.current = event.streams[0];
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
      };

      // Handle ICE candidates
      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit('video_call_ice_candidate', {
            receiverId: activeCall.participant._id,
            candidate: event.candidate
          });
        }
      };

    } catch (error) {
      console.error('Error initializing video call:', error);
      toast.error('Failed to access camera/microphone');
    }
  };

  // Accept incoming call
  const acceptCall = async (callData) => {
    setIncomingCall(null);
    setActiveCall({
      type: 'incoming',
      participant: callData.caller,
      status: 'connected'
    });

    socket.emit('video_call_answer', {
      callerId: callData.callerId,
      answer: 'accepted'
    });

    await initializeVideoCall();
  };

  // Reject incoming call
  const rejectCall = (callerId) => {
    setIncomingCall(null);
    socket.emit('video_call_answer', {
      callerId,
      answer: 'rejected'
    });
  };

  // Start outgoing call
  const startCall = (receiverId, callType = 'video') => {
    socket.emit('video_call_request', {
      receiverId,
      callType
    });

    setActiveCall({
      type: 'outgoing',
      participant: { _id: receiverId },
      status: 'calling'
    });
  };

  // End call
  const endCall = () => {
    if (activeCall) {
      socket.emit('video_call_end', {
        receiverId: activeCall.participant._id
      });
    }

    // Clean up streams
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }

    if (remoteStreamRef.current) {
      remoteStreamRef.current.getTracks().forEach(track => track.stop());
      remoteStreamRef.current = null;
    }

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    setActiveCall(null);
  };

  // Send message
  const sendMessage = (receiverId, content, messageType = 'text', replyTo = null) => {
    if (socket && isConnected) {
      socket.emit('send_message', {
        receiverId,
        content,
        messageType,
        replyTo
      });
    }
  };

  // Typing indicators
  const startTyping = (receiverId) => {
    if (socket && isConnected) {
      socket.emit('typing_start', { receiverId });
    }
  };

  const stopTyping = (receiverId) => {
    if (socket && isConnected) {
      socket.emit('typing_stop', { receiverId });
    }
  };

  // Mark message as read
  const markMessageAsRead = (messageId) => {
    if (socket && isConnected) {
      socket.emit('mark_read', { messageId });
    }
  };

  // Update status
  const updateStatus = (status) => {
    if (socket && isConnected) {
      socket.emit('status_change', { status });
    }
  };

  const value = {
    socket,
    isConnected,
    onlineFriends,
    typingUsers,
    incomingCall,
    activeCall,
    localVideoRef,
    remoteVideoRef,
    sendMessage,
    startTyping,
    stopTyping,
    markMessageAsRead,
    updateStatus,
    startCall,
    acceptCall,
    rejectCall,
    endCall,
  };

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};
