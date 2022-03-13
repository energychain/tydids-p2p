var assert = require('assert');
const axios = require("axios");
const TyDIDs = require("../TydidsP2P.js");
const sleep = ms => new Promise(r => setTimeout(r, ms));

/***
Test will create three instances A, B and C.
C will be our "Consumer" listening to "A"
After delegation the update should come from B (signed) by.
****/
describe('Delegate and Revoke', function () {
  let instanceA = null;  // Will become Owner
  let instanceB = null;  // Will become Delegate
  let instanceC = null; //  Will become Consumer

  let result = null;  // will Hold last presentation for Consumer;
  let lastRevision = null;

  let addressB = null;
  let addressA = null;

  this.timeout(50000);
  after(async function() {
    delete instanceA;
    delete instanceB;
    delete instanceC;
    await sleep(500);
     // process.exit(0)
  });
  describe('#identity', async function () {
    it('Create Identities', async function () {
      const instanceA_PrivateKey = TyDIDs.createPrivateKey();
      const instanceB_PrivateKey = TyDIDs.createPrivateKey();
      const instanceC_PrivateKey = TyDIDs.createPrivateKey();
      const log = console.log;
      console.log = function() {};
      instanceA = await TyDIDs.ssi(instanceA_PrivateKey,true);
      instanceB = await TyDIDs.ssi(instanceB_PrivateKey,true);
      instanceC = await TyDIDs.ssi(instanceC_PrivateKey,true);
      console.log = log;
      addressB = instanceB.identity.address;
      addressA = instanceA.identity.address;
      assert.notEqual(instanceA.identity.address,instanceB.identity.address);
    });
    it('Set original Presentation and ensure C is listening to', async function () {
      // Ensure C is listening to presentation (via ACK Callback)
      instanceC.onACK(function(presentation) {
        result = presentation;
      });

      // Retrieve Presentation to ensure C subsribed to updates
      instanceC.retrievePresentation(instanceA.identity.address);

      // Perform first Update
      await instanceA.updatePresentation({timestamp:new Date().getTime()});

      // Wait for our update to be detected by C
      while(result == null) {
        await sleep(200);
      }

      assert.equal(result.payload._address,addressA);
      assert.equal(result.signer.blockchainAccountId,addressA+'@eip155:6226');
    });
    it('Ensure we could do Blockchain Operation by getting some Gas', async function () {
      // A needs Gas to pay for blockchain transaction.
      await axios.get("https://api.corrently.io/v2.0/idideal/devmode?account="+instanceA.identity.address);
      let balance = 0;
      while(balance == 0) {
        await sleep(500);
        balance = await instanceA.wallet.getBalance();
      }
    });
    it('Delegate from A to B', async function () {
      await instanceA.delegate(instanceB.identity.address);
      await sleep(200);
    });
    it('B updates Presentation', async function () {
      assert.notEqual(instanceA.identity.address,instanceB.identity.address); // Both are independend
      await instanceB.setIdentifier(instanceA.identity.address); // set that this will run "on behalf of" A
      assert.equal(instanceA.identity.address,instanceB.identity.address); // Should now be Equal
      await sleep(200);

      // Performe update
      await instanceB.updatePresentation({timestamp:new Date().getTime()});
      await sleep(200);
    });
    it('Validate at C', async function () {
      assert.equal(result.payload._address,addressA);
      assert.equal(result.signer.blockchainAccountId,addressB+'@eip155:6226'); // Signed by is still B - However it looks like from A
      lastRevision = result.payload._revision // We remember this as this will be last valid update.
    });
    it('Revoke from A to B', async function () {
      await instanceA.revoke(instanceB.identity.owner);
      await sleep(200);
    });
    it('Validate Revoke at C (no effect due to no presentation update)', async function () {
      assert.equal(result.payload._address,addressA);
      assert.equal(result.signer.blockchainAccountId,addressB+'@eip155:6226'); // Signed by is still B - However it looks like from A
    });
    it('Let A update presentation (should work)', async function () {
      // Perform first Update
      result = null;
      await instanceA.updatePresentation({timestamp:new Date().getTime()});

      // Wait for our update to be detected by C
      while(result == null) {
        await sleep(200);
      }

      assert.equal(result.payload._address,addressA);
      assert.equal(result.signer.blockchainAccountId,addressA+'@eip155:6226');
    });
    it('Validate at C', async function () {
      assert.equal(result.payload._address,addressA);
      assert.equal(result.signer.blockchainAccountId,addressA+'@eip155:6226'); // Signed by is still B - However it looks like from A
      assert.notEqual(lastRevision,result.payload._revision);
    });
  });
  //
  //

});
