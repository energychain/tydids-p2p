var assert = require('assert');
const axios = require("axios");
const TyDIDs = require("../TydidsP2P.js");
const sleep = ms => new Promise(r => setTimeout(r, ms));

/***
Test will create two instances A and B
A will be get random role assigned by B
A validates if this random role got assigned by B
****/
describe('ID Role', function () {
  let instanceA = null;  // Will get a Role by B
  let instanceB = null;  // Will provide a Role to/for A

  let role=null; // Will be a random address as Role.

  let addressB = null;
  let addressA = null;

  this.timeout(50000);
  after(async function() {
    delete instanceA;
    delete instanceB;
    await sleep(500);
     // process.exit(0)
  });
  describe('#identity', async function () {
    it('Create Identities', async function () {
      const instanceA_PrivateKey = TyDIDs.createPrivateKey();
      const instanceB_PrivateKey = TyDIDs.createPrivateKey();
      const log = console.log;
      console.log = function() {};
      instanceA = await TyDIDs.ssi(instanceA_PrivateKey,true);
      instanceB = await TyDIDs.ssi(instanceB_PrivateKey,true);
      console.log = log;
      addressB = instanceB.identity.address;
      addressA = instanceA.identity.address;
      assert.notEqual(instanceA.identity.address,instanceB.identity.address);
      const w1 = TyDIDs.ethers.Wallet.createRandom();
      role = w1.address;
    });
    it('Check as A which role it has original', async function () {
      let _role = await instanceA.getIDRole(addressB,addressA);
      assert.equal(_role,'0x0000000000000000000000000000000000000000');
    });
    it('Ensure we could do Blockchain Operation by getting some Gas', async function () {
      // A needs Gas to pay for blockchain transaction.
      let res = await axios.get("https://api.corrently.io/v2.0/idideal/devmode?account="+instanceB.identity.address);
      assert(res.data.chainId,6226)
      let balance = 0;
      while(balance == 0) {
        await sleep(500);
        balance = await instanceB.wallet.getBalance();
      }
    });
    it('Let B assign Role to A', async function () {
      let _result = await instanceB.setIDRole(addressA,role);
      assert.equal(_result.chainId,6226);
      await sleep(500);
    });
    it('Check as A which role it has now', async function () {
      let _role = await instanceA.getIDRole(addressB,addressA);
      assert.equal(_role,'0x0000000000000000000000000000000000000000');
    });
  });
  //
  //

});
