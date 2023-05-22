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
