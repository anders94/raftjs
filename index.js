const dgram = require('node:dgram');
const { Buffer } = require('node:buffer');

const RaftNode = class {
    constructor(host, port) {
	if (host && port) {
	    this.host = host;
	    this.port = port;
	    this.peers = [];
	}
	else
	    console.log('must pass a host and port');

    }

    addPeer(host, port) {
	if (host && port)
	    this.peers.push([host, port]);
	else
	    console.log('must pass a host and port');

    }

    start() {
	if (this.peers.length < 2)
	    console.log('error: need at least 2 peers to start');
	else if (this.timer)
	    console.log('error: already started');
	else
	    this.timer = main(this);

    }

    stop() {
	if (this.timer)
	    clearInterval(this.interval);
	console.log('stopped');
    }

};

module.exports = RaftNode;

const rnd = () => 150 + Math.ceil(Math.random() * 500);

const main = (t) => {
    // start listening
    const socket = dgram.createSocket('udp4');

    socket.on('message', (msg, rinfo) => {
	console.log(`server got "${msg}" from ${rinfo.address}:${rinfo.port}`, msg.toString());
	if (msg == 'ping') {
	    //console.log('send pong', rinfo.address, rinfo.port);
	    socket.send('pong', rinfo.port, rinfo.address, (err) => {
		if (err)
		    console.log(err);

	    });
	}
	else if (msg == 'candidate') {
	    console.log(rinfo.address, rinfo.port, 'wants to be leader');

	    if (t.candidacy)
		clearTimeout(t.candidacy); // stop my candidacy

	    socket.send('leader', rinfo.port, rinfo.address, (err) => {
		if (err)
		    console.log(err);

	    });

	}
	else if (msg == 'leader') {
	    console.log('yay - i\'m leader!');
	    t.leader = t.host + ':' + t.port;

	    socket.send('leader ack', rinfo.port, rinfo.address, (err) => {
		if (err)
		    console.log(err);

	    });

	}
	else if (msg == 'leader ack') {
	    console.log('leader acknowledged', rinfo.address, rinfo.port);
	    t.leader = rinfo.address + ':' + rinfo.port;

	}

    });

    socket.bind({
	address: t.host,
	port: t.port
    });
    
    return setInterval(() => {
	console.log('loop');

	if (!t.leader) { // do we know the leader?
	    if (!t.candidacy) // is my candidacy in progress?
		t.candidacy = setTimeout(() => { // start my candidacy (after a random timeout)
		    for (const peer of t.peers) {
			socket.send('candidate', peer[1], peer[0], (err) => {
			    if (err)
				console.log(err);

			});
		    }
		}, rnd());

	}
	else { // leader liveness check
	    console.log('leader is', t.leader.split(':'));

	}

	console.log();
    }, 1000);
};
