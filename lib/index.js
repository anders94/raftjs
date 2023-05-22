const dgram = require('node:dgram');
const { rnd, hash, serialize, deserialize, payloadBuilder } = require('./helpers');

const RaftNode = class {
    constructor(host, port) {
	if (host && port) {
	    this.id = hash(4);
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
	    console.log(this.id, 'must pass a host and port');

    }

    start() {
	if (this.peers.length < 2)
	    console.log(this.id, 'error: need at least 2 peers to start');
	else if (this.timer)
	    console.log(this.id, 'error: already started');
	else
	    this.timer = main(this);

    }

    stop() {
	if (this.timer)
	    clearInterval(this.interval);
	console.log(this.id, 'stopped');
    }

};

module.exports = RaftNode;

const main = (t) => {
    const socket = dgram.createSocket('udp4');

    socket.on('message', (msg, rinfo) => {
	console.log(t.id, `got "${msg}" from ${rinfo.address}:${rinfo.port}`);
	const o = deserialize(msg.toString());

	if (!o)
	    throw new Error('unable to parse JSON'); // TODO: better handle this

	if (o.msg == 'ping') {
	    //console.log(t.id, 'send pong', rinfo.address, rinfo.port);
	    socket.send(payloadBuilder(t, 'pong'), rinfo.port, rinfo.address, (err) => {
		if (err)
		    console.log(t.id, err);

	    });
	}
	else if (o.msg == 'pong') {
	    if (t.leader && rinfo.address == t.leader.host && rinfo.port == t.leader.port)
		t.leader.seen = new Date().getTime(); // if this is the leader, update last seen time
	}
	else if (o.msg == 'candidate') {
	    console.log(t.id, rinfo.address, rinfo.port, o.id, 'wants to be leader');
	    t.otherCandidate = {host: rinfo.address, port: rinfo.port, seen: new Date().getTime()};

	    if (t.candidacy) {
		t.candidacy = false;
		clearTimeout(t.candidacyTimer); // stop my candidacy
	    }

	    socket.send(payloadBuilder(t, 'leader'), rinfo.port, rinfo.address, (err) => {
		if (err)
		    console.log(t.id, err);

	    });

	}
	else if (o.msg == 'leader') {
	    console.log(t.id, 'yay - i\'m leader!');
	    t.leader = {host: t.host, port: t.port, id: t.id, seen: new Date().getTime()};

	    socket.send(payloadBuilder(t, 'leader ack'), rinfo.port, rinfo.address, (err) => {
		if (err)
		    console.log(t.id, err);

	    });

	}
	else if (o.msg == 'leader ack') {
	    console.log(t.id, 'leader acknowledged', rinfo.address, rinfo.port);
	    t.leader = {host: rinfo.address, port: rinfo.port, id: o.id, seen: new Date().getTime()};

	}

    });

    // start listening
    socket.bind({
	address: t.host,
	port: t.port

    });

    return setInterval(() => {
	console.log(t.id, 'loop');

	if (t.otherCandidate && new Date().getTime() - t.otherCandidate.seen > 2000) // if we've been waiting too long on another candidacy...
	    t.otherCandidate = null;

	if (!t.leader) { // if we don't know the leader
	    if (!t.candidacy && !t.otherCandidate) { // if i don't know of any candidacies
		console.log(t.id, 'start my candidacy');
		t.candidacy = true;
		t.candidacyTimer = setTimeout(() => { // start my candidacy (after a random timeout)
		    for (const peer of t.peers) {
			socket.send(payloadBuilder(t, 'candidate'), peer[1], peer[0], (err) => {
			    if (err)
				console.log(t.id, err);

			});

		    }
		    t.candidacy = false;
		}, rnd());

	    }

	}
	else { // leader liveness check
	    console.log(t.id, 'leader is', t.leader);
	    if (!(t.leader.host == t.host && t.leader.port == t.port)) { // only ping if I am not the leader
		socket.send(payloadBuilder(t, 'ping'), t.leader.port, t.leader.host, (err) => {
                    if (err)
			console.log(t.id, err);

		});

	    }

	}

	console.log();
    }, 1000);
};
