# intercom.js
### Cross-Window Broadcast Interface

Intercom is a client-side library that broadcasts messages to all of a user's open windows / tabs (open to your site, of course). A [socket.io binding](#using-with-socketio) is built in—which allows a single socket connection to painlessly propagate messages to all windows.

The service is built on top of the [HTML5 localStorage API](http://www.w3.org/TR/webstorage/#the-localstorage-attribute).

### Basic Usage

```javascript
var intercom = new Intercom();

intercom.on('notice', function(data) {
	console.log(data.message);
});

intercom.emit('notice', {message: 'Hello, all windows!'});
```

## Using with Socket.io

With the [socket.io](http://socket.io/) binding it's easy set up the socket connection to broadcast messages it recieves to all open windows. Similarly, it's effortless to send messages over a single active socket from any open window (simply by calling `emit` on intercom).

```javascript
intercom.bind(socket);
```

If you wish to override the default behavior to control whether the socket should be treated as read-only or write-only, use:

```javascript
intercom.bind(socket, {
	send    : false, // send messages to the socket from intercom
	recieve : true   // read messages from the socket and broadcast them over intercom
});
```

### Filtering Messages

There could be some cases where you want fine control over what is or isn't read from / sent to the socket. The `transmit` and `recieve` options also accept callbacks that are invoked for each message to determine if it should be emitted. Returning `false` from either of these will cause the message to be ignored.

```javascript
intercom.bind(socket, {
	send: function(name, message) {
		return message.socket;
	},
	recieve: function(name, message) {
		return message.broadcast;
	}
});
```

With the configuration above, messages like the following won't be sent to the socket:

```javascript
intercom.emit('notice', {
	socket: false,
	message: 'I won\'t be sent over the socket!'
});
```

Similarly, only messages coming from the socket that have `broadcast` set to true will be picked up by intercom.

## License

Copyright &copy; 2012 DIY Co

Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at: http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.