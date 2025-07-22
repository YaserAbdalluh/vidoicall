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

    // عناصر التحكم
    muteBtn.addEventListener('click', toggleMute);
    videoBtn.addEventListener('click', toggleVideo);

    async function startCall() {
        try {
            localStream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: true
            });

            localVideo.srcObject = localStream;
            setupPeerConnection();

            socket.emit('join-room', roomId, socket.id);

        } catch (err) {
            console.error('Error accessing media devices:', err);
        }
    }

    function setupPeerConnection() {
        const configuration = {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' }
            ]
        };

        peerConnection = new RTCPeerConnection(configuration);

        // إضافة التدفق المحلي
        localStream.getTracks().forEach(track => {
            peerConnection.addTrack(track, localStream);
        });

        // معالجة المرشح ICE
        peerConnection.onicecandidate = ({ candidate }) => {
            if (candidate) {
                socket.emit('signal', {
                    type: 'ice-candidate',
                    candidate,
                    roomId
                });
            }
        };

        // معالجة التدفق البعيد
        peerConnection.ontrack = ({ streams: [stream] }) => {
            remoteVideo.srcObject = stream;
        };

        // معالجة الإشارات من Socket.io
        socket.on('signal', async (data) => {
            if (data.type === 'offer') {
                await peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));
                const answer = await peerConnection.createAnswer();
                await peerConnection.setLocalDescription(answer);

                socket.emit('signal', {
                    type: 'answer',
                    answer,
                    roomId,
                    to: data.from
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

    function toggleMute() {
        const audioTracks = localStream.getAudioTracks();
        audioTracks.forEach(track => {
            track.enabled = !track.enabled;
        });
        isMuted = !isMuted;
        muteBtn.textContent = isMuted ? 'Unmute' : 'Mute';
    }

    function toggleVideo() {
        const videoTracks = localStream.getVideoTracks();
        videoTracks.forEach(track => {
            track.enabled = !track.enabled;
        });
        isVideoOff = !isVideoOff;
        videoBtn.textContent = isVideoOff ? 'Start Video' : 'Stop Video';
    }

    startCall();
}