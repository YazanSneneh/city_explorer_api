'use strict';
// modules
const express = require('express');
const app = express();

const cors = require('cors');
app.use(cors());

require('dotenv').config();

const PORT = process.env.PORT;

app.get('/location', handleLocation);

// handler functions
function handleLocation(req, res) {
    const query = req.query.city;
    const result = locationLonLat(query);
    res.send(result);
}
const locationLonLat = (query) => {
    const location = require('./data/location.json');
    const lon = location[0].lon;
    const lat = location[0].lat;
    const display = location[0].display_name;
    const resObj = new CityObject(query, display, lon, lat);

    return resObj;
}

function CityObject(query, display, lon, lat) {
    this.search_query = query;
    this.formatted_query = display;
    this.latitude = lat;
    this.longitude = lon;
}

app.listen(PORT, () => {
    console.log('app is listening on port ' + PORT);
})