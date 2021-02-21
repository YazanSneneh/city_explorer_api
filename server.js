'use strict';
const express = require('express');

const app = express();
require('dotenv').config();
const PORT = process.env.PORT;

app.get('/', (req, res) => {
    res.send('hey!!!')
})

app.listen(PORT, () => {
    console.log('app is listening on port ' + PORT);
})
