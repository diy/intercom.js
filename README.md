# intercom.js
### Cross-Window Broadcast Interface

Intercom is a client-side library that broadcasts messages to all of a user's open windows / tabs (open to your site, of course). A [socket.io binding](#using-with-socketio) is built in—which allows a single socket connection to painlessly propagate messages to all windows.

The service is built on top of the [HTML5 sessionStorage API](http://www.w3.org/TR/webstorage/#the-sessionstorage-attribute).

## Usage

```javascript
var intercom = new Intercom();

intercom.on('notice', function(data) {
	console.log(data.message);
});

intercom.emit('notice', {message: 'Hello, all windows!'});
```

### Using with Socket.io

With the [socket.io](http://socket.io/) binding it's easy set up the socket connection to broadcast messages it recieves to all open windows. Similarly, it's effortless to send messages over the single active socket from any open window (simply by calling `emit` on intercom).

```javascript
intercom.bind(socket);
```

If you wish to override the default behavior to control whether the socket should be treated as read-only or write-only, use:

```javascript
intercom.bind(socket, {
	transmit : false, // send messages emitted on intercom over the socket
	recieve  : true   // broadcast messages from the socket
});
```


## License

Copyright &copy; 2012 DIY Co

Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at: http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.