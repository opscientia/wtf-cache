const express = require('express')
const { wtf } = require('../init')
const dbWrapper = require('../utils/dbWrapper')

const runInitialInputValidation = (service, credentials) => {
  const validServices = ['orcid', 'google', 'github', 'twitter', 'discord']
  if (!validServices.includes(service)) {
    console.log('getAddressForCredentials: Requestor supplied invalid service')
    return { error: 'Invalid service' }
  }
  if (credentials.includes(' ')) {
    console.log('getAddressForCredentials: Requestor supplied invalid credentials')
    return { error: 'Invalid credentials' }
  }
  return { success: true }
}

/**
 * Get the crypto address linked to the provided credentials.
 * Example request: 
 * curl -X GET https://sciverse.id/addressForCredentials?credentials=email&service=google
 */
const getAddressForCredentials = async (service, credentials) => {
  console.log('getAddressForCredentials: Entered')

  const validationData = runInitialInputValidation(service, credentials)
  if (validationData.error) {
    return
  }

  const user = await dbWrapper.selectUser(service, credentials)
  if (user) {
    console.log('getAddressForCredentials: Retrieved address from cache. Returning now.')
    return user['address']
  }
  console.log('getAddressForCredentials: No address in cache. Retrieving it with wtf-lib')
  const address = await wtf.addressForCredentials(credentials, service)
  return address
}


module.exports = {
  getAddressForCredentials: async (req, res) => {
    const address = await getAddressForCredentials(req.query.service, req.query.credentials)
    return res.status(200).json(address)
  }
}
