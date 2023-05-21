# raftjs

A Node.js implementation of the RAFT protocol using UDP.

(very early - not yet functional - work is in progress)

## Usage
Either use the included `test.js` or do something like this:
```js
const RaftNode = require('./lib');

const rn = new RaftNode('127.0.0.1', 3000);
rn.addPeer('127.0.0.1', 3001);
rn.addPeer('127.0.0.1', 3002);
rn.start();
```

## Notes
Right now all we do is elect a leader. More later.

Eventually I'm going to make this a module.
