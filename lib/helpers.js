const crypto = require('crypto');

exports.hash = (num) => {
    const chars = 'ABCDEFGHJKLMNPRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    const rnd = crypto.randomBytes(num);

    let value = new Array(num);

    for (var i=0; i<num; i++) {
        value[i] = chars[rnd[i] % chars.length]
    };

    return value.join('');
};

exports.rnd = () => 150 + Math.ceil(Math.random() * 500);

exports.serialize = (o) => JSON.stringify(o);

exports.deserialize = (s) => {
    let o;
    try {
	o = JSON.parse(s);

    }
    catch (e) {

    }
    return o;

};

exports.payloadBuilder = (me, msg) => {
    const o = {
	id: me.id,
	msg: msg,
	leader: { }
    };
    if (me.leader) {
	o.leader = {
	    host: me.leader.host,
	    port: me.leader.port,
	    id: me.leader.id
	}
    }

    return JSON.stringify(o);

}
