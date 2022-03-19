#!/usr/bin/env node
const out = console.log;

console.log = function() {}

const tydids = require("./TydidsP2P.js");
const fs = require("fs");

const { program } = require('commander');

program
  .option('-priv --privateKey <key>')
  .option('-i --identity')
  .option('-x --exit')
  .option('-p --presentation [address]')
  .option('-d --delegate <address>')
  .option('-r --reset')
  .option('-v --verbose')
  .option('-s --set')
  .option('-T --timeout <milliseconds>')
  .option('-H --history <address>')
  .option('-o --output <file>')
  .option('-f --input <file>')
  .option('--relay <port>')
  .option('--peer <url>')
  .option('-w --writeTydidsJSON')
  .option('--createPrivateKey')
  .option('--age')

program.parse();

const options = program.opts();
const args = program.args;

if(fs.existsSync('./.tydids.json')) {
	let settings = JSON.parse(fs.readFileSync('./.tydids.json'));
	if(typeof settings.privateKey !== 'undefined') {
    options["privateKey"] = settings.privateKey;
  }
  if(typeof settings.defaultDID !== 'undefined') {
    if(typeof options.presentation == 'undefined') {
      options.presentation = settings.defaultDID;
    }
  }
}

let openApp = true;
let privateKey = null;
if(typeof options.privateKey !== 'undefined') { privateKey = options.privateKey};
if(typeof options.createPrivateKey !== 'undefined') {
  let wallet = tydids.ethers.Wallet.createRandom();
  out(wallet.privateKey);
  openApp = false;
  if(typeof options.writeTydidsJSON !== 'undefined') {
      let obj = {
        privateKey: wallet.privateKey,
        address:wallet.address
      };
      fs.writeFileSync("./.tydids.json",JSON.stringify(obj));
  }
}
if(typeof options.verbose !== 'undefined') {
  console.log = out;
}
let reset = false;
if(typeof options.reset !== 'undefined') reset = true;
if(typeof options.presentation !== 'undefined') reset = true;

const app = async function() {
  let port = options.relay;
  let peers = null;
  if(typeof options.peer !== 'undefined') {
    peers = [options.peer];
  }

  const ssi = await tydids.ssi(privateKey,reset,null,port,peers);
  if(typeof options.verbose !== 'undefined') {
    out('TyDIDs P2P version',ssi.version);
    ssi.onACK (function(_presentation) {
      out('ACK',_presentation.payload._revision);
      //out(_presentation);
      if(options.age !== 'undefined') {
        let age = Math.round((new Date().getTime() / 1000) - _presentation.payload.iat);
        console.dir({
          secondsAgo:age,
          at:new Date(_presentation.payload.iat * 1000).toString()
        });
      }
      return {pong:new Date().getTime()};
    });
    ssi.onReceivedACK(function(from,did) {
      out('ACKRcpt',from);
    });
  }
  if(typeof options.presentation == 'undefined') {
    ssi.emitter.on('payload:ethr:6226:'+ssi.identity.address,function(data) {

      if(options.age !== 'undefined') {
        let age = Math.round((new Date().getTime() / 1000) - data.iat);
        console.dir({
          secondsAgo:age,
          at:new Date(data.iat * 1000).toString()
        });
      }
    });
  }


  if(typeof options.identity !== 'undefined') {
    out(ssi.identity);
  }
  if((typeof options.set !== 'undefined') && (args.length == 2)) {
    let addload = {}
    addload[args[0]] = args[1];
    let imutable = await ssi.updatePresentation(addload);
    out("Revision",imutable.revision);
  }
  if(typeof options.input !== 'undefined') {
    const storeFile = async function() {
      let data = JSON.parse(fs.readFileSync(options.input));
      let imutable = await ssi.updatePresentation(data);
      out("Revision",imutable.revision);
    }
    const fs = require("fs");
    fs.watchFile(options.input,(curr, prev) => {
      storeFile();
    });
    storeFile();
  }
  if(typeof options.history !== 'undefined') {
      let history = await ssi.retrieveRevisions(options.history,options.timeout,true);
      for(let i=0;i<history.length;i++) {
        if((typeof history[i] !== 'undefined') && (typeof history[i].did !== 'undefined')) {
          out(history[i].did.payload);
        }
      }
  }
  if(typeof options.presentation !== 'undefined') {
    let outputPresentation = true;
    let presentation = await ssi.retrievePresentation(options.presentation);
    if(typeof options.verbose !== 'undefined') outputPresentation.true;
    if(outputPresentation) {
      if(typeof options.output !== 'undefined') {
        const fs = require("fs");
        fs.writeFileSync(options.output, JSON.stringify(presentation));
      }
      ssi.emitter.on('payload:ethr:6226:'+options.presentation,function(data) {
        out(data);
        if(options.age !== 'undefined') {
          let age = Math.round((new Date().getTime() / 1000) - data.iat);
          console.dir({
            secondsAgo:age,
            at:new Date(data.iat * 1000).toString()
          });
        }
        if(typeof options.output !== 'undefined') {
          const fs = require("fs");
          fs.writeFileSync(options.output, JSON.stringify(data));
        }
      });
      out(presentation);

      if(options.age !== 'undefined') {
        let age = Math.round((new Date().getTime() / 1000) - presentation.iat);
        console.dir({
          secondsAgo:age,
          at:new Date(presentation.iat * 1000).toString()
        });
      }
    }
  }
  if(typeof options.delegate !== 'undefined') {
    let res = await ssi.delegate(options.delegate);
    out(res);
  }
  if(typeof options.exit !== 'undefined') { process.exit(0) }
}
if(openApp) {

  app();
} else {
  process.exit(0);
}
