![intercom.js](https://raw.github.com/diy/intercom.js/master/logo.png)
### Cross-Window Message Broadcast Interface

Intercom is a client-side library that allows one window to broadcast messages to all other open windows / tabs (open to your site, of course). A [socket.io binding](#using-with-socketio) is built in—which allows a single socket connection to painlessly propagate messages to all windows. Useful for chat services, notifications, and more.

The service is built on top of the [HTML5 localStorage API](http://www.w3.org/TR/webstorage/#the-localstorage-attribute).

**Browser Support** ([chart](http://caniuse.com/#search=webstorage)): IE8+, Firefox 3.6+, Chrome 4+, Safari 4+, Opera 10.5+

### Basic Usage

```javascript
// run this in multiple tabs!
var intercom = Intercom.getInstance();

intercom.on('notice', function(data) {
	console.log(data.message);
});

intercom.emit('notice', {message: 'Hello, all windows!'});
```

## Using with Socket.io

With the [socket.io](http://socket.io/) binding it's easy set up the socket connection to broadcast messages it receives to all open windows. It's also effortless to send messages over a single active socket from any open window (by calling `emit` on intercom).

```javascript
intercom.bind(socket);
```

If you wish to override the default behavior to control whether the socket should be treated as read-only or write-only, use:

```javascript
intercom.bind(socket, {
	send    : false, // send messages to the socket from intercom
	receive : true   // read messages from the socket and broadcast them over intercom
});
```

### Filtering Messages

There could be some cases where you want fine control over what is or isn't read from / sent to the socket. The `send` and `receive` options also accept callbacks that are invoked for each message to determine if it should be emitted. Returning `false` from either of these will cause the message to be ignored.

```javascript
intercom.bind(socket, {
	send: function(name, message) {
		return message.socket;
	},
	receive: function(name, message) {
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

### Uniqueness Contraints

In the case of multiple sockets in different windows possibly emitting the same message, use the `id` option to ensure it's only acknowledged once by each window.

```javascript
intercom.bind(socket, {
	id: function(name, message) {
		return name + message.id;
	}
});
```

This requires you to send a unique identifier for each message from the socket.io source.

## Methods

### .emit(name, message)

Broadcasts a message to all open windows (including the current window).

### .on(name, fn)

Sets up a listener to be invoked when a message with the given name is received.

### .once(key, fn, [ttl])

Given a unique unique key to represent the function, `fn` will be invoked in only one window. The `ttl` argument represents the number of seconds before the function can be called again.

### Intercom.destroy()

Removes all data associated with intercom from `localStorage`.

### Intercom.getInstance()

Returns an instance of Intercom. If one doesn't exist, it will be instantiated.

## License

Copyright &copy; 2012 DIY Co

Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at: http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.