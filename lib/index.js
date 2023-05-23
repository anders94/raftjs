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
	    this.peers.push({host: host, port: port});
	else
	    console.log(this.id, 'must pass a host and port');

    }

    start() {
	if (this.timer)
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

const leaderTimeout = 10 * 1000; // 5 seconds

const main = (t) => {
    const socket = dgram.createSocket('udp4');

    socket.on('message', (msg, rinfo) => {
	console.log(t.id, `got "${msg}" from ${rinfo.address}:${rinfo.port}`);

	for (const peer of t.peers) { // update last seen if it is one of our peers
	    if (peer.host == rinfo.address && peer.port == rinfo.port)
		peer.seen = new Date().getTime();
	}

	const o = deserialize(msg.toString());

	if (!o)
	    throw new Error('unable to parse JSON'); // TODO: handle this better

	if (o.msg == 'ping') {
	    //console.log(t.id, 'send pong to', rinfo.address, rinfo.port);
	    socket.send(payloadBuilder(t, 'pong'), rinfo.port, rinfo.address, (err) => {
		if (err)
		    console.log(t.id, err);

	    });
	}
	else if (o.msg == 'pong') {
	    //console.log(t.id, 'got pong from', rinfo.address, rinfo.port);
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
	    // TODO: check that a quarum of nodes agrees before doing this
	    console.log(t.id, 'YAY - I\'m leader!');
	    t.leader = {host: t.host, port: t.port};

	    socket.send(payloadBuilder(t, 'leader ack'), rinfo.port, rinfo.address, (err) => {
		if (err)
		    console.log(t.id, err);

	    });

	}
	else if (o.msg == 'leader ack') {
	    console.log(t.id, 'leader acknowledged', rinfo.address, rinfo.port);
	    t.leader = {host: t.host, port: t.port};

	}

    });

    // start listening
    socket.bind({
	address: t.host,
	port: t.port

    });

    return setInterval(() => {
	console.log(t.id, 'loop');

	if (t.otherCandidate && new Date().getTime() - t.otherCandidate.seen > 3000) // if we've been waiting too long on another candidacy...
	    t.otherCandidate = null;

	if (t.leader) { // if we know the leader
	    console.log(t.id, 'leader is', t.leader);

	    if (!(t.leader.host == t.host && t.leader.port == t.port)) { // if I am not the leader
		console.log('aaa', 'searching peers for the leader');
		for (const peer of t.peers) {
		    console.log('bbb', 'evaluating', peer);
		    if (peer.host == t.leader.host && peer.port == t.leader.port) {
			console.log('ccc', peer.id, 'found. last seen', peer.seen, 'which was', new Date().getTime() - peer.seen, 'ago');
			if (new Date().getTime() - peer.seen > leaderTimeout) {
			    console.log('oh crap - leader hasn\'t been seen in a while - removing');
			    t.leader = null;

			}

		    }

		}

		// do a liveness check to our dear leader
		socket.send(payloadBuilder(t, 'ping'), t.leader.port, t.leader.host, (err) => {
		    if (err)
			console.log(t.id, err);

		});

	    }

	}
	else { // if we don't know the leader
	    if (!t.candidacy && !t.otherCandidate) { // if i don't know of any candidacies
		console.log(t.id, 'start my candidacy');
		t.candidacy = true;
		t.candidacyTimer = setTimeout(() => { // start my candidacy (after a random timeout)
		    for (const peer of t.peers) {
			socket.send(payloadBuilder(t, 'candidate'), peer.port, peer.address, (err) => {
			    if (err)
				console.log(t.id, err);

			});

		    }
		    t.candidacy = false;
		}, rnd());

	    }

	}

	console.log();
    }, 1000);
};
