var assert = require('assert');
const TyDIDs = require("../TydidsP2P.js");
const sleep = ms => new Promise(r => setTimeout(r, ms));

describe('Remote Object', function () {
  let instanceA = null;  // Will become Consumer
  const remote_address = '0x19B9f727e38F224dE49b564282c339F1f8e224Ea'; // Timestamp updated every 20 seconds
  this.timeout(50000);
  after(async function() {
    delete instanceA;
    await sleep(500);
     process.exit(0)
  });
  it('Create Identity', async function () {
    const instanceA_PrivateKey = TyDIDs.createPrivateKey();
    instanceA = await TyDIDs.ssi(instanceA_PrivateKey,true);
  });
  it('Retrieve well known updated presentation', async function () {
    let res = await instanceA.retrievePresentation(remote_address);
    assert.equal('World',res.Hello);
    assert.equal(res.timestamp > new Date().getTime() - 40000,true); // Expect timestamp no older than 50 seconds;
  });
});
