/**
 * cache-server exposes an API that allows other entities to retrieve
 * and update data in its cache.
 */

const app = require('./index')

module.exports = {
  run: app.listen(3000, (err) => {
    if (err) throw err
    console.log('Server running in http://127.0.0.1:3000')
  })
}