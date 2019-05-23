// -----------------------------------------------------------------
// Screen sharing
if (canScreenShare()) {
    // alert("canScreenShare: " + canScreenShare());
}
function canScreenShare() {
    // return isFirefox() || isChrome();
    return isChrome();
}
function isChrome() {
    return 'chrome' in window;
}
function getUserScreen() {
    var extensionId = 'bepipdpoeefcllmepmnochbhmcalifol';
    if (!canScreenShare()) {
        return;
    }
    if (isChrome()) {
        return new Promise((resolve, reject) => {
            const request = {
                sources: ['screen']
            };
            chrome.runtime.sendMessage(extensionId, request, response => {
                if (response && response.type === 'success') {
                    resolve({streamId: response.streamId});
                } else {
                    reject(new Error('Could not get stream'));
                }
            });
        }).then(response => {
            return navigator.mediaDevices.getUserMedia({
                video: {
                    mandatory: {
                        chromeMediaSource: 'desktop',
                        chromeMediaSourceId: response.streamId
                    }
                }
            });
        });
    } else if (isFirefox()) {
        return navigator.mediaDevices.getUserMedia({
            video: {
                mediaSource: 'screen'
            }
        });
    }
}
var screenTrack;
function ShareScreen() {
    alert("ShareScreen ");
    getUserScreen().then(function (stream) {
        screenTrack = stream.getVideoTracks()[0];
        activeRoom.localParticipant.publishTrack(screenTrack);
        document.getElementById('button-share-screen').style.display = 'none';
        document.getElementById('button-unshare-screen').style.display = 'inline';
    });
}
function UnshareScreen() {
    alert("UnshareScreen ");
    activeRoom.localParticipant.unpublishTrack(screenTrack);
    screenTrack = null;
}