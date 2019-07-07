/**
 * Module dependencies
 */
const express = require('express'); // Web server

let app = express();

/**
 * Routing
 */
app.get('/', async function(req, res) {
    res.send('Hello, world!');
});

module.exports = app;