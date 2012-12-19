sipdomain = "vims1.com";
server = "https://api.foundry.att.com/a2/webrtc";

function formatPhone(phonenum) {
  var regexObj = /^(?:\+?1[-. ]?)?(?:\(?([0-9]{3})\)?[-. ]?)?([0-9]{3})[-. ]?([0-9]{4})$/;
  if (regexObj.test(phonenum)) {
    var parts = phonenum.match(regexObj);
    var phone = "";
    if (parts[1]) { phone += "+1 (" + parts[1] + ") "; }
    phone += parts[2] + "-" + parts[3];
    return phone;
  }
  else {
    //invalid phone number
    return phonenum;
  }
}

function login(num, vnum)
{
  selfnumber.textContent = vnum;
  self.num = num;
  self.phono = $.phono({
        server: server,
        apiKey: "oauth " + num,
        video: false,
        
        onReady: function() {
          $.mobile.changePage($("#make-call"));
        },
          
        phone: {
        
            onIncomingCall: function(evt)
            {
              self.call = evt.call;
              var rNum = evt.call.from;
              
            self.call.onHangup = function() {
              $.mobile.changePage($("#make-call"));
            };
              
              var match = rNum.match(/[0-9]+/);
              if (match.length > 0)
                rNum = match[0];
              rNum = formatPhone(rNum);
              $(".remote-user").text(rNum);
              $.mobile.changePage($("#incoming-call"));
            }
        }

      });
      
  $.mobile.changePage($("#logging-in"));
}

// $(login);

$(".incoming-call-answer").live("click", function() {
  self.call.answer();
  $.mobile.changePage($("#call"));
  self.call.onHangup = function() {
    $.mobile.changePage($("#make-call"));
  };
  self.call.onError = function() {
    $.mobile.changePage($("#make-call"));
  };
  
  self.call.onAddStream = function(e) {
    console.log("Onaddstream");
    remoteVideo.style.display = "block"
    remoteVideo.src = webkitURL.createObjectURL(e.stream);
              
    //localVideo.style.display = "block"
    //localVideo.src = webkitURL.createObjectURL(this.localStreams[0]);
  };
});

$(".incoming-call-reject").live("click", function() {
  self.call.hangup();
  $.mobile.changePage($("#make-call"));
});

$(".call-hangup").live("click", function() {
  self.call.hangup();
  $.mobile.changePage($("#make-call"));
});

function do_login()
{
  login(username.value);
}

function do_logout()
{
  phono._ms.unregister();
  $.mobile.changePage("logout");
}

function do_call()
{
  make_call(remote_number.value);
}

function make_call(num)
{

  $(".remote-user").text(formatPhone(num));
  self.call = phono.phone.dial("sip:"+num + "@" + sipdomain, {
    onRing: function() {
      
    },
    onAnswer: function() {
      this.onHangup = function() {
        $.mobile.changePage($("#make-call"));
      };
      $.mobile.changePage($("#call"));
    },
    onHangup: function() {
      setTimeout(function() { if ($.mobile.activePage.attr("id") == "outgoing-call-rejected") $.mobile.changePage($("#make-call"), {reverse: true});}, 2000);
      $.mobile.changePage($("#outgoing-call-rejected"), {transition: "fade"});
    },
    onError: function() {
      setTimeout(function() { if ($.mobile.activePage.attr("id") == "outgoing-call-rejected") $.mobile.changePage($("#make-call"), {reverse: true});}, 2000);
      $.mobile.changePage($("#outgoing-call-rejected"), {transition: "fade"});
    },
    onAddStream: function(e) {
      console.log("Onaddstream");
      //remoteVideo.style.display = "block"
      //remoteVideo.src = webkitURL.createObjectURL(e.stream);
              
      //localVideo.style.display = "block"
      //localVideo.src = webkitURL.createObjectURL(this.localStreams[0]);
    },
  });
  
  $.mobile.changePage($("#outgoing-call"));

}
