const fs = require('fs');
require('dotenv').config({path:'.env'});
let pk=(process.env.PRIVATE_KEY||process.env.HYPER_TRADER_PRIVATE_KEY||'').trim().replace(/^\"(.*)\"$/,'').replace(/^'(.*)'$/,'');
if(!pk.startsWith('0x')&&pk) pk='0x'+pk;
console.log('PK_len', pk.length);
console.log('PK_preview', pk.slice(0,10)+'...'+pk.slice(-8));
console.log('valid64hex', /^0x[0-9a-fA-F]{64}$/.test(pk));
console.log('RPC', process.env.HYPER_RPC_URL);
console.log('API', process.env.HYPER_API_URL);
