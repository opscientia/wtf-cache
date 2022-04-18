const NodeCache = require('node-cache')
const wtf = require('wtf-lib')
require('dotenv').config();

const cache = new NodeCache()
// wtf.setProviderURL({ 'polygon' : process.env.MORALIS_NODE })
wtf.setProviderURL({ 'polygon' : 'https://rpc-mumbai.maticvigil.com' })

module.exports = {
  cache: cache,
  wtf: wtf,
}
