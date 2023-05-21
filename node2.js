const RaftNode = require('./lib');

const rn = new RaftNode('127.0.0.1', 3001);
rn.addPeer('127.0.0.1', 3000);
rn.addPeer('127.0.0.1', 3002);
rn.start();
