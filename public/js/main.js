function init(roomId) {
    const socket = io();
    const localVideo = document.getElementById('local-video');
    const remoteVideo = document.getElementById('remote-video');
    const muteBtn = document.getElementById('mute-btn');
    const videoBtn = document.getElementById('video-btn');

    let localStream;
    let peerConnection;
    let isMuted = false;
    let isVideoOff = false;

    muteBtn.addEventListener('click', toggleMute);
    videoBtn.addEventListener('click', toggleVideo);

    async function startCall() {
        try {
            // Try to access camera and microphone
            localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            localVideo.srcObject = localStream;
        } catch (err) {
            console.warn('Could not access media devices:', err);

            // Optional: show a message to the user
            alert('Camera or microphone is in use or blocked. You will join without sending video/audio.');

            // Fallback to no media
            localStream = null;
        }

        setupPeerConnection();
        socket.emit('join-room', roomId, socket.id);
    }


    function setupPeerConnection() {
        const configuration = {
            iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
        };
        peerConnection = new RTCPeerConnection(configuration);

        localStream.getTracks().forEach(track => {
            peerConnection.addTrack(track, localStream);
        });

        peerConnection.onicecandidate = ({ candidate }) => {
            if (candidate) {
                socket.emit('signal', {
                    type: 'ice-candidate',
                    candidate,
                    roomId,
                    from: socket.id
                });
            }
        };

        peerConnection.ontrack = ({ streams: [stream] }) => {
            remoteVideo.srcObject = stream;
        };

        socket.on('signal', async (data) => {
            if (data.to && data.to !== socket.id) return;

            if (data.type === 'offer') {
                await peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));
                const answer = await peerConnection.createAnswer();
                await peerConnection.setLocalDescription(answer);
                socket.emit('signal', {
                    type: 'answer',
                    answer,
                    roomId,
                    to: data.from,
                    from: socket.id
                });
            } else if (data.type === 'answer') {
                await peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
            } else if (data.type === 'ice-candidate') {
                try {
                    await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
                } catch (err) {
                    console.error('Error adding ICE candidate:', err);
                }
            }
        });
    }

    socket.on('user-connected', async (newUserId) => {
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        socket.emit('signal', {
            type: 'offer',
            offer,
            roomId,
            to: newUserId,
            from: socket.id
        });
    });

    function toggleMute() {
        const audioTracks = localStream.getAudioTracks();
        audioTracks.forEach(track => track.enabled = !track.enabled);
        isMuted = !isMuted;
        muteBtn.textContent = isMuted ? 'Unmute' : 'Mute';
    }

    function toggleVideo() {
        const videoTracks = localStream.getVideoTracks();
        videoTracks.forEach(track => track.enabled = !track.enabled);
        isVideoOff = !isVideoOff;
        videoBtn.textContent = isVideoOff ? 'Start Video' : 'Stop Video';
    }

    startCall();
}
