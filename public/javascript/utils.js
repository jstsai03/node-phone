function formatPhone(addr) {

  var regexObj = /^(?:\+?1[-. ]?)?(?:\(?([0-9]{3})\)?[-. ]?)?([0-9]{3})[-. ]?([0-9]{4})$/;
  if (regexObj.test(addr)) {
    var parts = addr.match(regexObj);
    var phone = "";
    if (parts[1]) { phone += "+1 (" + parts[1] + ") "; }
    phone += parts[2] + "-" + parts[3];
    return phone;
  }
  else {
    //invalid phone number
    return addr;
  }
}
