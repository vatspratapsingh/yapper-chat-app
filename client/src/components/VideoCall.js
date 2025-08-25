import React from 'react';
import { useSocket } from '../contexts/SocketContext';
import { FiPhoneOff, FiMic, FiMicOff, FiVideo, FiVideoOff, FiMonitor } from 'react-icons/fi';

const VideoCall = () => {
  const {
    activeCall,
    localVideoRef,
    remoteVideoRef,
    endCall,
  } = useSocket();

  const [isMuted, setIsMuted] = React.useState(false);
  const [isVideoOff, setIsVideoOff] = React.useState(false);
  const [isScreenSharing, setIsScreenSharing] = React.useState(false);

  if (!activeCall) return null;

  const toggleMute = () => {
    if (localVideoRef.current?.srcObject) {
      const audioTrack = localVideoRef.current.srcObject.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (localVideoRef.current?.srcObject) {
      const videoTrack = localVideoRef.current.srcObject.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
      }
    }
  };

  const toggleScreenShare = async () => {
    try {
      if (!isScreenSharing) {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true
        });
        
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = screenStream;
        }
        setIsScreenSharing(true);
      } else {
        // Stop screen sharing and resume camera
        if (localVideoRef.current?.srcObject) {
          localVideoRef.current.srcObject.getTracks().forEach(track => track.stop());
        }
        // Reinitialize camera stream
        const cameraStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true
        });
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = cameraStream;
        }
        setIsScreenSharing(false);
      }
    } catch (error) {
      console.error('Screen sharing error:', error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="relative w-full h-full max-w-6xl max-h-screen p-4">
        {/* Remote video (main) */}
        <div className="w-full h-full rounded-lg overflow-hidden bg-gray-900">
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />
        </div>

        {/* Local video (picture-in-picture) */}
        <div className="absolute top-4 right-4 w-48 h-36 rounded-lg overflow-hidden bg-gray-900 border-2 border-white">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
        </div>

        {/* Call info */}
        <div className="absolute top-4 left-4 bg-black bg-opacity-50 text-white px-4 py-2 rounded-lg">
          <h3 className="font-medium">
            {activeCall.participant.fullName || 'Unknown User'}
          </h3>
          <p className="text-sm text-gray-300">
            {activeCall.status === 'connected' ? 'Connected' : 'Calling...'}
          </p>
        </div>

        {/* Controls */}
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex items-center space-x-4">
          <button
            onClick={toggleMute}
            className={`video-control-btn ${isMuted ? 'bg-red-600' : ''}`}
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <FiMicOff size={20} /> : <FiMic size={20} />}
          </button>

          <button
            onClick={toggleVideo}
            className={`video-control-btn ${isVideoOff ? 'bg-red-600' : ''}`}
            title={isVideoOff ? 'Turn on video' : 'Turn off video'}
          >
            {isVideoOff ? <FiVideoOff size={20} /> : <FiVideo size={20} />}
          </button>

          <button
            onClick={toggleScreenShare}
            className={`video-control-btn ${isScreenSharing ? 'bg-blue-600' : ''}`}
            title={isScreenSharing ? 'Stop sharing' : 'Share screen'}
          >
            <FiMonitor size={20} />
          </button>

          <button
            onClick={endCall}
            className="video-control-btn danger"
            title="End call"
          >
            <FiPhoneOff size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default VideoCall;
