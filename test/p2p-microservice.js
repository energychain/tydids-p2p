var assert = require('assert');
const TyDIDs = require("../TydidsP2P.js");
const sleep = ms => new Promise(r => setTimeout(r, ms));

describe('MicroService P2P Communication', function () {
  let instanceA = null;  // Will become Consumer
  let instanceB = null;  // Will become Service
  let instanceC = null; //  Will become a Prosumer (Consumer and Service)

  let resultB = null; // Will hold last returned presentation of Service (instanceB) - set by Consumer
  let resultC = null; // Will hold last returned presentation of ProSumer (instanceC) - set by Consumer

  let ackB = 0;  // Counter of Acknowledges

  this.timeout(50000);
  after(async function() {
    delete instanceA;
    delete instanceB;
    delete instanceC;
    await sleep(500);
     process.exit(0)
  });
  describe('#identity', async function () {
    it('Create Identities', async function () {
      const instanceA_PrivateKey = TyDIDs.createPrivateKey();
      const instanceB_PrivateKey = TyDIDs.createPrivateKey();
      const instanceC_PrivateKey = TyDIDs.createPrivateKey();
      instanceA = await TyDIDs.ssi(instanceA_PrivateKey,true);
      instanceB = await TyDIDs.ssi(instanceB_PrivateKey,true);
      instanceC = await TyDIDs.ssi(instanceC_PrivateKey,true);
      assert.notEqual(instanceA.identity.address,instanceB.identity.address);
    });
    it('Setup MicroService, listen to Consumer', async function () {
        // MicroService needs to "Listen" to Consumer and respond
        instanceB.onACK(async function(presentation) {
          ackB++;
          // Return simple Sum of A + B given in Presentation Payload of Consumer
          return {result:(presentation.payload.A  + presentation.payload.B)}
        });
        // We do not setup instanceA.onReceivedACK here, as we want to test it later

        // Ensure MicroService listens to Challenges of Consumer
        instanceB.retrievePresentation(instanceA.identity.address);
    });
    it('Setup Consumer', async function () {
      assert.equal(resultB,null);
      assert.equal(resultC,null);
      // subscribe to results and put them in globals
      instanceA.onReceivedACK(function(from,did,revision) {
          if(from == instanceB.identity.address) resultB = did;
          if(from == instanceC.identity.address) resultC = did;
      });
    });
    it('Consumer presents challenge and expects sum by service', async function () {
      assert.equal(resultB,null);
      assert.equal(resultC,null);

      let A = Math.round(Math.random()*1000);
      let B = Math.round(Math.random()*1000);

      await instanceA.updatePresentation({
        A:A,
        B:B
      });

      // wait for results
      while(resultB == null) {
        await sleep(200);
      }

      assert.equal(resultB.payload.result,A+B);
      assert.equal(resultC,null);
    });
    it('Consumer update challenge and expects different sum by service', async function () {
      assert.notEqual(resultB,null);
      assert.equal(resultC,null);
      const oldSum = resultB.payload.result;
      let A = Math.round(Math.random()*1000);
      let B = Math.round(Math.random()*1000);

      await instanceA.updatePresentation({
        A:A,
        B:B
      });

      // wait for result update (there is a better way we test later!)
      while(resultB.payload.result == oldSum) {
        await sleep(200);
      }
      assert.equal(resultB.payload.result,A+B);  
    });
  });
});
