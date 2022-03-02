#!/usr/bin/env node
const out = console.log;

console.log = function() {}

const tydids = require("./TydidsP2P.js");
const fs = require("fs");

const { program } = require('commander');

program
  .option('-priv --privateKey <key>')
  .option('-w --writeTydidsJSON')
  .option('-i --identity')
  .option('-x --exit')
  .option('-c --createPresentation')
  .option('-p --presentation <identity>')
  .option('-d --delegate <identity>')
  .option('-a --ancestor <id>')
  .option('-v --verbose')
  .option('-s --set')
  .option('-m --managedCredentials')
  .option('--createPrivateKey')
  .option('--jwtID');

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

const app = async function() {
  const ssi = await tydids.ssi(privateKey);
  if(typeof options.verbose !== 'undefined') {
    out('TyDIDs P2P version',ssi.version);
  }
  //await ssi.waitManagedCredentials();
  if(typeof options.managedCredentials !== 'undefined') {
      await ssi.waitManagedCredentials();
      out(ssi.managedCredentials);
  }

  if(typeof options.jwtID !== 'undefined') {
      out(await ssi.buildJWTDid(ssi.identity));
  }

  if(typeof options.identity !== 'undefined') { out(ssi.identity); }
  if(typeof options.presentation !== 'undefined') {
    let outputPresentation = true;
    let presentation = await ssi.retrievePresentation(options.presentation);
    // Add Delegation handling here!
    if(typeof options.delegate !== 'undefined') {
      ssi.emitter.on('delegation',function(data) {
        out(data);
      });

      try {
        let res = await ssi.delegate(options.presentation,options.delegate);
        out(res);
      } catch(e) {
        out(e);
      }
    }
    if(typeof options.writeTydidsJSON !== 'undefined') {
      if(fs.existsSync('./.tydids.json')) {
        let settings = JSON.parse(fs.readFileSync('./.tydids.json'));
        settings.defaultDID = options.presentation
        fs.writeFileSync('./.tydids.json',JSON.stringify(settings));
      }
    }

    if((typeof options.ancestor !== 'undefined')) {
      presentation._ancestor = options.ancestor;
    }
    if((typeof options.set !== 'undefined') && (args.length == 2)) {
      presentation[args[0]] = args[1];
      await ssi.updatePresentation(options.presentation,presentation);
    }

    if(typeof options.verbose !== 'undefined') outputPresentation.true;

    if(outputPresentation) {
      ssi.emitter.on('did:ethr:6226:'+options.presentation,function(data) {
        out(data);
      });
      out(presentation);
    }
  }
  if(typeof options.createPresentation !== 'undefined') {
    ssi.emitter.on('cMP',function(data) {
      console.log(data);
    });
    let nssi = await ssi.createPresentation();
    out(nssi);
    if(typeof options.writeTydidsJSON !== 'undefined') {
      if(fs.existsSync('./.tydids.json')) {
      	let settings = JSON.parse(fs.readFileSync('./.tydids.json'));
        settings.defaultDID = nssi.address;
        fs.writeFileSync('./.tydids.json',JSON.stringify(settings));
      }
    }
  }
  if(typeof options.exit !== 'undefined') { process.exit(0) }
}
if(openApp) {

  app();
} else {
  process.exit(0);
}
