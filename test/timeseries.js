var assert = require('assert');
const TyDIDs = require("../TydidsP2P.js");
const sleep = ms => new Promise(r => setTimeout(r, ms));

describe('Timeseries of Presentations', function () {
  let instanceA = null;  // Will become Consumer
  let instanceB = null;  // Will become Service

  let ackB = 0;  // Counter of Acknowledges

  this.timeout(50000);
  after(async function() {
    delete instanceA;
    delete instanceB;
    await sleep(500);
     // process.exit(0)
  });
    it('Create Identities', async function () {
      const instanceA_PrivateKey = TyDIDs.createPrivateKey();
      const instanceB_PrivateKey = TyDIDs.createPrivateKey();
      const log = console.log;
      console.log = function() {};
      instanceA = await TyDIDs.ssi(instanceA_PrivateKey,true);
      instanceB = await TyDIDs.ssi(instanceB_PrivateKey,true);
      console.log = log;
      assert.notEqual(instanceA.identity.address,instanceB.identity.address);
    });
    it('Let B publish Data every second', async function () {
      const publish = async function() {
        instanceB.updatePresentation({timestamp:new Date().getTime()});
      }

      await publish();
      setInterval(publish,1000);
      await sleep(5000);
    });
    it('Let A retrieve History after some seconds', async function () {
      let history = await instanceA.retrieveRevisions(instanceB.identity.address,3000,true);
      assert.equal(history.length > 1,true);
      console.log("History Length",history.length);
    });
});
