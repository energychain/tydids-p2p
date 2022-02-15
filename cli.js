#!/usr/bin/env node
const out = console.log;

console.log = function() {}

const tydids = require("./TydidsP2P.js");

const { program } = require('commander');

program
  .option('-priv --privateKey <key>')
  .option('-i --identity')
  .option('-x --exit')
  .option('-c --createPresentation')
  .option('-p --presentation <identity>')
  .option('-v --verbose')
  .option('-s --set')
  .option('--createPrivateKey');

program.parse();

const options = program.opts();
const args = program.args;

let openApp = true;
let privateKey = null;
if(typeof options.privateKey !== 'undefined') { privateKey = options.privateKey};
if(typeof options.createPrivateKey !== 'undefined') {
  let wallet = tydids.ethers.Wallet.createRandom();
  out(wallet.privateKey);
  openApp = false;
}

const app = async function() {
  const ssi = await tydids.ssi(privateKey);
  //await ssi.waitManagedCredentials();
  if(typeof options.identity !== 'undefined') { out(ssi.identity); }
  if(typeof options.presentation !== 'undefined') {
    let outputPresentation = true;
    let presentation = await ssi.retrieveVP(options.presentation);

    if((typeof options.set !== 'undefined') && (args.length == 2)) {
      presentation[args[0]] = args[1];
      await ssi.updateVP(options.presentation,presentation);
    }

    if(typeof options.verbose !== 'undefined') outputPresentation.true;

    if(outputPresentation) {
      ssi.emitter.on('did:ethr:6226:'+options.presentation,function(data) {
        out(presentation);
      });
      out(presentation);
    }
  }
  if(typeof options.createPresentation !== 'undefined') {
    out(await ssi.createManagedPresentation());
  }
  if(typeof options.exit !== 'undefined') { process.exit(0) }
}
if(openApp) {

  app();
} else {
  process.exit(0);
}
