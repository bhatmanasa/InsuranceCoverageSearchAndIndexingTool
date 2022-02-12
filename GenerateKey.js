const NodeRSA = require('node-rsa');
class GenerateKeys{
    constructor(){

    }
    getKeys(){
        
const key = new NodeRSA({ b:1024});

var public_key = key.exportKey('public');
var private_key = key.exportKey('private');

console.log(public_key+"; "+private_key);
let res = {'public':public_key, 'private':private_key};
return public_key;
    }
}

module.exports = GenerateKeys;