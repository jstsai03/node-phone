# Noded-Voice

This is the beta branch of Noded-Voice which is compatible with the a1 (IIP) service only

This example app uses module passport-att-alpha to handle oauth with AT&T alpha API program at apimatrix.tfoundry.com.
It then uses the WebRTC API's to enable WebRTC calling from a browser.
The WebRTC browser implementations are still evolving, so for now you have to start by down-loading a version of the Chromium browser, from here  http://js.webphone.tfoundry.com//leif121015/
If you're using a Mac, you also have to download boost.zip from the above link and unzip it into "/opt/local/lib/".

## Pre-requisites

mongodb installed  
a working node.js environment  
The special chromium browser downloaded and installed  
An active account on http://apimatrix.tfoundry.com and a newly created app  

## How to Create an App on http://apimatrix.tfoundry.com

To create an app login to apimatrix.  
Click My Apps,  
Click Register a New App.  
Complete name, description (mandatory).  
For the callback url use "http://localhost:5000/users/auth/att/callback"  
Click Register App

## Installation

Download the git repository.  
git clone git@github.com:att-innovate/noded-voice.git  
cd into the repo and run npm install  
You will need to define an app in apimatrix.tfoundry.com  
Edit the file .env.sh.txt, adding your newly created client id and client secret from your app in apimatrix and then rename the file to .env.sh  
Source the file to set the environment variables - source .env.sh  

Start mongodb.  Example - mongod --dbpath /tmp &

Start the app - node app.js

Open the newly download chromium browser and go to http://localhost:5000

## Examples

A working version of the app is available at: http://noded-voice.herokuapp.com  Remember to use the just downloaded chromium browser

## Credits

  - [Geoff Hollingworth](http://github.com/eusholli)

## License

(The MIT License)

Copyright (c) 2012 Geoff Hollingworth

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
the Software, and to permit persons to whom the Software is furnished to do so,
subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
