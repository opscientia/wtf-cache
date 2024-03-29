const ethers = require('ethers')
const sanitizeHtml = require('sanitize-html')
const { wtf } = require('../init')
const dbWrapper = require('../utils/dbWrapper')

const wtfBiosAddresses = wtf.getContractAddresses()['WTFBios']
const vjwtAddresses = wtf.getContractAddresses()['VerifyJWT']

const testProviders = {
  'ethereum': new ethers.providers.JsonRpcProvider('http://localhost:8545')
}
const prodProviders = {
  'gnosis': new ethers.providers.JsonRpcProvider(process.env.ANKR_GNOSIS_ENDPOINT),
  // 'polygon': new ethers.providers.JsonRpcProvider('https://polygon-rpc.com/'),
  // 'mumbai': new ethers.providers.JsonRpcProvider('https://rpc-mumbai.matic.today/')
  'mumbai': new ethers.providers.JsonRpcProvider(process.env.ANKR_MUMBAI_ENDPOINT)
}
const providers = process.env.WTF_USE_TEST_CONTRACT_ADDRESSES == "true"
                  ? testProviders : prodProviders

const updateUser = async (address, chain) => {
  address = address.toLowerCase()
  const user = await dbWrapper.getUserByAddressOnChain(address, chain)
  const newHolo = await wtf.getHolo(address)
  const chainIsInResp = !!newHolo?.[chain]
  const rpcCallFailed = !chainIsInResp || Object.keys(newHolo[chain]).length == 0;
  if (rpcCallFailed) {
    console.log(`RPC call to ${chain} failed for user ${address}`)
    return;
  }
  const params = [
    // Sanitize html in case user stored malicious code in their credentials
    sanitizeHtml(newHolo[chain]['name']),
    sanitizeHtml(newHolo[chain]['bio']),
    sanitizeHtml(newHolo[chain]['orcid']),
    sanitizeHtml(newHolo[chain]['google']),
    sanitizeHtml(newHolo[chain]['github']),
    sanitizeHtml(newHolo[chain]['twitter']),
    sanitizeHtml(newHolo[chain]['discord'])
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

/**
* @param {ethers.Contract} contract A contract (VerifyJWT or WTFBios) instantiated with a provider.
*/
const updateDbEntriesForUsersInContract = async (contract, chain) => {
  const allAddrsInContract = await contract.getRegisteredAddresses()
  for (let address of allAddrsInContract) {
    await updateUser(address, chain)
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

module.exports = {
  updateUser: updateUser,
  updateUsersInDb: updateUsersInDb
}
