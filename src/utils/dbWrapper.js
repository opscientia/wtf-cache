const sqlite3 = require('sqlite3').verbose();

const { db } = require('../init')


/**
 * Select from users table where column=value.
 * @returns Row in user table if user exists, null otherwise. Returns first item that matches query.
 */
module.exports.selectUser = (column, value) => {
  return new Promise((resolve, reject) => {
    db.get(`SELECT * FROM users WHERE ${column}=?`, value, (err, row) => {
      if (err) {
        console.log(err)
        reject(err)
      } else {
        resolve(row)
      }
    })
  })
}

module.exports.getUserByAddress = async (address) => {
  return await module.exports.selectUser('address', address)
}

/**
 * Get all rows in users table.
 */
module.exports.getAllUsers = () => {
  return new Promise((resolve, reject) => {
    db.all(`SELECT * FROM users`, [], (err, rows) => {
      if (err) {
        console.log(err)
        reject(err)
      } else {
        resolve(rows)
      }
    })
  })
}

/**
 * Run the given SQL command with the given parameters. 
 * Helpful for UPDATEs and INSERTs.
 */
module.exports.runSql = (sql, params) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, (err) => {
      if (err) {
        console.log(err)
        reject(err)
      }
    })
  })
}
