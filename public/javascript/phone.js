var phone = $.phone({
    // we just pass our accessToken
    token: "YOUR ACCESS TOKEN",
    // specify what we want to do when
    // we're ready to make calls
    onReady: function () {
        window.activeCall = phone.dial('1-800-444-4444');
    },
    onIncomingCall: function (call) {
        window.activeCall = call;
        // auto answer
        call.answer();
    }
});
