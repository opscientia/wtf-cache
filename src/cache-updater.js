/**
 * This script runs alongside cache-server. It queries all WTF 
 * contracts at regular intervals and updates the local database 
 * with the up-to-date user holos.
 */
const { EventEmitter } = require('events');
const ethers = require('ethers')
const { wtf } = require('./init')
const dbWrapper = require('./utils/dbWrapper')

const wtfBiosAddresses = wtf.getContractAddresses()['WTFBios']
const vjwtAddresses = wtf.getContractAddresses()['VerifyJWT']

const testProviders = {
  'ethereum': new ethers.providers.JsonRpcProvider('http://localhost:8545')
}
const prodProviders = {
  'gnosis': new ethers.providers.JsonRpcProvider('https://rpc.gnosischain.com/'),
  'polygon': new ethers.providers.JsonRpcProvider('https://polygon-rpc.com/'),
  // 'mumbai': new ethers.providers.JsonRpcProvider('https://rpc-mumbai.matic.today/')
  'mumbai': new ethers.providers.JsonRpcProvider(process.env.ALCHEMY_MUMBAI_ENDPOINT)
}
const providers = process.env.WTF_USE_TEST_CONTRACT_ADDRESSES == "true"
                  ? testProviders : prodProviders

/**
 * @param {ethers.Contract} contract A contract (VerifyJWT or WTFBios) instantiated with a provider.
 */
const updateDbEntriesForUsersInContract = async (contract, chain) => {
  const allAddrsInContract = await contract.getRegisteredAddresses()
  for (let address of allAddrsInContract) {
    address = address.toLowerCase()
    const user = await dbWrapper.getUserByAddressOnChain(address, chain)
    const newHolo = await wtf.getHolo(address)
    const chainIsInResp = !!newHolo?.[chain]
    const rpcCallFailed = chainIsInResp ? Object.keys(newHolo[chain]).length == 0 : false
    if (rpcCallFailed) {
      console.log(`RPC call to ${chain} failed for user ${address}`)
      continue;
    }
    const params = [
      newHolo[chain]['name'],
      newHolo[chain]['bio'],
      newHolo[chain]['orcid'],
      newHolo[chain]['google'],
      newHolo[chain]['github'],
      newHolo[chain]['twitter'],
      newHolo[chain]['discord']
    ]
    if (user) {
      const columns = 'name=?, bio=?, orcid=?, google=?, github=?, twitter=?, discord=?'
      await dbWrapper.runSql(`UPDATE ${chain} SET ${columns} WHERE address=?`, [...params, address])
    }
    else {
      const columns = '(address, name, bio, orcid, google, github, twitter, discord)'
      await dbWrapper.runSql(`INSERT INTO ${chain} ${columns} VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [address, ...params])
    }
  }
}

/**
 * Retrieve registered addresses from each WTF contract, and for each address, 
 * retrieve from the blockchain its holo and update the db with the retrieved holo.
 */
const updateUsersInDb = async () => {
  for (const network of Object.keys(vjwtAddresses)) {
    const provider = providers[network]
    for (const service of Object.keys(vjwtAddresses[network])) {
      const vjwtAddr = vjwtAddresses[network][service]
      const vjwtABI = wtf.getContractABIs()['VerifyJWT']
      const vjwtWithProvider = new ethers.Contract(vjwtAddr, vjwtABI, provider)
      await updateDbEntriesForUsersInContract(vjwtWithProvider, network)
    }
    const wtfBiosABI = wtf.getContractABIs()['WTFBios']
    const wtfBiosAddress = wtfBiosAddresses[network]
    const wtfBiosWithProvider = new ethers.Contract(wtfBiosAddress, wtfBiosABI, provider)
    await updateDbEntriesForUsersInContract(wtfBiosWithProvider, network)
  }
}

const runUpdater = async () => {
  const eventEmitter = new EventEmitter();
  eventEmitter.on('newInterval', async () => await updateUsersInDb())
  const waitTime = 20 * 1000
  setInterval(() => {
    eventEmitter.emit('newInterval')
  }, waitTime)
}

console.log(`cache-updater pid: ${process.pid}`)

runUpdater()
