const RaftNode = require('./lib');

const rn0 = new RaftNode('127.0.0.1', 3000);
rn0.addPeer('127.0.0.1', 3001);
rn0.addPeer('127.0.0.1', 3002);
rn0.start();

const rn1 = new RaftNode('127.0.0.1', 3001);
rn1.addPeer('127.0.0.1', 3000);
rn1.addPeer('127.0.0.1', 3002);
rn1.start();
