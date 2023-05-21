const dgram = require('node:dgram');

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
	console.log(`got "${msg}" from ${rinfo.address}:${rinfo.port}`, msg.toString());
	if (msg == 'ping') {
	    //console.log('send pong', rinfo.address, rinfo.port);
	    socket.send('pong', rinfo.port, rinfo.address, (err) => {
		if (err)
		    console.log(err);

	    });
	}
	else if (msg == 'pong') {
	    if (t.leader && rinfo.address == t.leader.host && rinfo.port == t.leader.port)
		t.leader.seen = new Date().getTime(); // if this is the leader, update last seen time
	}
	else if (msg == 'candidate') {
	    console.log(rinfo.address, rinfo.port, 'wants to be leader');
	    t.otherCandidate = {host: rinfo.address, port: rinfo.port, seen: new Date().getTime()};

	    if (t.candidacy) {
		t.candidacy = false;
		clearTimeout(t.candidacyTimer); // stop my candidacy
	    }

	    socket.send('leader', rinfo.port, rinfo.address, (err) => {
		if (err)
		    console.log(err);

	    });

	}
	else if (msg == 'leader') {
	    console.log('yay - i\'m leader!');
	    t.leader = {host: t.host, port: t.port, seen: new Date().getTime()};

	    socket.send('leader ack', rinfo.port, rinfo.address, (err) => {
		if (err)
		    console.log(err);

	    });

	}
	else if (msg == 'leader ack') {
	    console.log('leader acknowledged', rinfo.address, rinfo.port);
	    t.leader = {host: rinfo.address, port: rinfo.port, seen: new Date().getTime()};

	}

    });

    socket.bind({
	address: t.host,
	port: t.port
    });
    
    return setInterval(() => {
	console.log('loop');

	if (t.otherCandidate && new Date().getTime() - t.otherCandidate.seen > 2000) // if we've been waiting too long on another candidacy...
	    t.otherCandidate = null;

	if (!t.leader) { // if we don't know the leader
	    if (!t.candidacy && !t.otherCandidate) { // if i don't know of any candidacies
		console.log('start my candidacy');
		t.candidacy = true;
		t.candidacyTimer = setTimeout(() => { // start my candidacy (after a random timeout)
		    for (const peer of t.peers) {
			socket.send('candidate', peer[1], peer[0], (err) => {
			    if (err)
				console.log(err);

			});
		    }
		    t.candidacy = false;
		}, rnd());
	    }

	}
	else { // leader liveness check
	    console.log('leader is', t.leader);
	    socket.send('ping', t.leader.port, t.leader.host, (err) => {
                if (err)
                    console.log(err);

            });


	}

	console.log();
    }, 1000);
};
