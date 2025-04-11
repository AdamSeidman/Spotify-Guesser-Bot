/**
 * HTTP endpoint for status checking.
 * 
 * Author: Adam Seidman
 */

const log = require('../base/log')
const express = require('express')
const config = require('../client/config')

const PORT = config.statusPort || 80

let app = express()

app.get('/', (req, res) => {
    res.send('<div>Song Chains</div>')
})

app.get('/status', (req, res) => {
    res.status(200).json({
        status: 'OK'
    })
})

const server = require('http').Server(app)

server.listen(PORT, () => {
    log.info(`Express server listening on port ${PORT}`, 'express.listen')
})
