// -----------------------------------------------------------------------------
var roomName;
var clientId = "";
var identity = clientId;
var theToken = "";

// -----------------------------------------------------------------------------
var activeRoom;
var previewTracks;

// Attach the Tracks to the DOM.
function attachTracks(tracks, container) {
    tracks.forEach(function (track) {
        container.appendChild(track.attach());
    });
}
// Attach the Participant's Tracks to the DOM.
function attachParticipantTracks(participant, container) {
    var tracks = Array.from(participant.tracks.values());
    attachTracks(tracks, container);
}

// Detach the Tracks from the DOM.
function detachTracks(tracks) {
    tracks.forEach(function (track) {
        track.detach().forEach(function (detachedElement) {
            detachedElement.remove();
        });
    });
}
// Detach the Participant's Tracks from the DOM.
function detachParticipantTracks(participant) {
    var tracks = Array.from(participant.tracks.values());
    detachTracks(tracks);
}

// -----------------------------------------------------------------------------
// Successfully connected!
function roomJoined(room) {
    
    window.room = activeRoom = room;
    log("Joined as: " + clientId);
    log("+ activeRoom join: " + activeRoom);
    document.getElementById('button-join').style.display = 'none';
    document.getElementById('button-leave').style.display = 'inline';

    // Attach LocalParticipant's Tracks, if not already attached.
    var previewContainer = document.getElementById('local-media');
    if (!previewContainer.querySelector('video')) {
        attachParticipantTracks(room.localParticipant, previewContainer);
    }
    // ----------------------------------------------------
    // Attach the Tracks of the Room's Participants.
    room.participants.forEach(function (participant) {
        log("Already in Room: " + participant.identity);
        var previewContainer = document.getElementById('remote-media');
        attachParticipantTracks(participant, previewContainer);
    });
    
    // ----------------------------------------------------
    // When a Participant joins the Room, log the event.
    room.on('participantConnected', function (participant) {
        log("Joining: " + participant.identity);
    });
    // When a Participant adds a Track, attach it to the DOM.
    room.on('trackAdded', function (track, participant) {
        log(participant.identity + " added track: " + track.kind);
        var previewContainer = document.getElementById('remote-media');
        attachTracks([track], previewContainer);
    });
    // When a Participant removes a Track, detach it from the DOM.
    room.on('trackRemoved', function (track, participant) {
        log(participant.identity + " removed track: " + track.kind);
        detachTracks([track]);
    });
    // When a Participant leaves the Room, detach its Tracks.
    room.on('participantDisconnected', function (participant) {
        log("Participant '" + participant.identity + "' left the room");
        detachParticipantTracks(participant);
    });
    // -------------
    // Once the LocalParticipant leaves the room, detach the Tracks
    // of all Participants, including that of the LocalParticipant.
    room.on('disconnected', function () {
        log('You have left the room: ' + roomName);
        if (previewTracks) {
            previewTracks.forEach(function (track) {
                track.stop();
            });
        }
        detachParticipantTracks(room.localParticipant);
        room.participants.forEach(detachParticipantTracks);
        activeRoom = null;
        document.getElementById('button-join').style.display = 'inline';
        document.getElementById('button-leave').style.display = 'none';
    });
    // ----------------------------------------------------
}

function leaveRoomIfJoined() {
    if (activeRoom) {
        activeRoom.disconnect;
    }
}

// -----------------------------------------------------------------------------
function listDevices() {
    log("listDevices:");
    navigator.mediaDevices.enumerateDevices().then(devices => {
        const videoInput = devices.find(device => device.kind === 'videoinput');
        // log("+ " + videoInput.deviceId);
        // return createLocalTracks({ audio: true, video: { deviceId: videoInput.deviceId } });

    });
    // reference: https://www.twilio.com/blog/2018/04/choosing-cameras-javascript-mediadevices-api.html
    navigator.mediaDevices.enumerateDevices().then(devices => {
        devices.forEach((device) => {
            log("+ " + device.kind + " : " + device.deviceId);
        });
    });
}

// -----------------------------------------------------------------------------
var setCamera = true;
var setMic = true;

function toggleCamera() {
    if (setCamera) {
        log('Camera set OFF');
        setCamera = false;
        $("#button-camera").html('Set Camera ON');
        return;
    }
    log('Camera set ON');
    setCamera = true;
    $("#button-camera").html('Set Camera OFF');
}
function toggleMic() {
    if (setMic) {
        log('Mic set OFF');
        setMic = false;
        $("#button-Mic").html('Set Mic ON');
        return;
    }
    log('Mic set ON');
    setMic = true;
    $("#button-Mic").html('Set Mic OFF');
}

// -----------------------------------------------------------------------------
function getToken() {
    // Since, programs cannot make an Ajax call to a remote resource,
    // Need to do an Ajax call to a local program that goes and gets the token.
    log("Refresh the token.");
    roomName = document.getElementById('roomid').value;
    clientId = document.getElementById('clientid').value;
    if (roomName === "") {
        log("++ Enter a room name.");
        return;
    }
    if (clientId === "") {
        log("++ Enter participant identity.");
        return;
    }
    identity = clientId;
    log("Using participant id: " + clientId + ".");
    log("Using room name: " + roomName + ".");
    $.get("getToken.php?clientid=" + clientId + "&roomid=" + roomName, function (gotToken) {
        theToken = gotToken.trim();
        log("Token refreshed.");
        log("theToken: " + theToken);
    })
            .fail(function () {
                log("- Error refreshing the token.");
                quit;
            });
}
function setClientId() {
    clientId = $("#clientid").val();
}
function setRoomId() {
    roomName = $("#roomid").val();
}
function refreshToken() {
    setClientId();
    setRoomId();
    getToken();
}

// -----------------------------------------------------------------------------
// Activity log.
function log(message) {
    var logDiv = document.getElementById('log');
    logDiv.innerHTML += '<p>&gt;&nbsp;' + message + '</p>';
    logDiv.scrollTop = logDiv.scrollHeight;
}
window.onload = function () {
    log('+++ Start.');
    // When we are about to transition away from this page, disconnect
    // from the room, if joined.
    window.addEventListener('beforeunload', leaveRoomIfJoined);
    document.getElementById('room-controls').style.display = 'block';

    // Bind button to join Room.
    document.getElementById('button-join').onclick = function () {
        if (!theToken) {
            log('++ Get a token.');
            return;
        }
        log("Joining room: " + roomName + ", Camera:" + setCamera + " Mic:" + setMic);
        var connectOptions = {
            name: roomName,
            video: setCamera, // { width: 800 }
            baudio: setMic,
            logLevel: 'debug'
        };
        if (previewTracks) {
            connectOptions.tracks = previewTracks;
        }
        Twilio.Video.connect(theToken, connectOptions).then(roomJoined, function (error) {
            log('Could not connect to Twilio: ' + error.message);
        });
    };
    // Bind button to leave Room.
    document.getElementById('button-leave').onclick = function () {
        log('Leave the room: ' + roomName);
        activeRoom.disconnect();
    };
    // Preview LocalParticipant's Tracks.
    document.getElementById('button-preview').onclick = function () {
        log("+ Preview LocalParticipant's Tracks.");
        var localTracksPromise = previewTracks
                ? Promise.resolve(previewTracks)
                : Twilio.Video.createLocalTracks();
        localTracksPromise.then(function (tracks) {
            window.previewTracks = previewTracks = tracks;
            var previewContainer = document.getElementById('local-media');
            if (!previewContainer.querySelector('video')) {
                attachTracks(tracks, previewContainer);
            }
        }, function (error) {
            console.error('Unable to access local media', error);
            log('Unable to access Camera and Microphone');
        });
    };
};

// -----------------------------------------------------------------------------
