const ethers = require("ethers");
const https = require("https");
const sleep = ms => new Promise(r => setTimeout(r, ms));
const EthCrypto = require("eth-crypto");
const jsontokens = require("jsontokens");

const EventEmitter = require('events');

const _encryptWithPublicKey = async function(publicKey,data) {
  const enc = await EthCrypto.encryptWithPublicKey(
         publicKey,
         data);
  return enc;
}

const _decryptWithPrivateKey = async function(privateKey,data) {
  data = EthCrypto.cipher.parse(data);
  return await EthCrypto.decryptWithPrivateKey(privateKey,data);
}

const TydidsP2P = {
  jsontokens:jsontokens,
  ethers:ethers,
  _encryptWithPublicKey:_encryptWithPublicKey,
  _decryptWithPrivateKey:_decryptWithPrivateKey,
  ssi:async function(privateKey,gun) {
    if((typeof privateKey == 'undefined') || (privateKey == null)) {
      privateKey = '0x52a3442496ba4cd6444ddd147855725741bc385e93d08d66c62d01a7347531b7'; // view Only Key! Do not Delegate to 0x6f7197B17384Ac194eE0DfaC444D018F174C4553
    }
    let dids = {};
    let piLog = {};

    const EthrDID = require("ethr-did").EthrDID;
    const getResolver = require('ethr-did-resolver').getResolver;
    const Resolver = require('did-resolver').Resolver;

    const config = {
      rpcUrl: "https://rpc.tydids.com/",
      name: "mainnet",
      chainId: "6226",
      registry:"0xaC2DDf7488C1C2Dd1f8FFE36e207D8Fb96cF2fFB",
      abi:require("./EthereumDIDRegistry.abi.json"),
      gunPeers:['https://webrtc.tydids.com/gun']
    }

    class Events extends EventEmitter {
      constructor(config) {
         super();
      }
    }

    const _publishIdentity  = async function(_identity) {
      _identity.updated = new Date().getTime();
      if((typeof piLog[_identity.address] == 'undefined') || (piLog[_identity.address] < _identity.updated - 5000)) {
          piLog[_identity.address] = _identity.updated;
            try {
                const statsUpdate = function(ack) {
                    if(typeof ack.err == 'undefined') { stats.identity.ok++; } else { stats.identity.err++; }
                }
                const jwt = await _buildJWTDid(_identity);
                const did = {did:jwt,uri:"did:ethr:6226:"+_identity.address};
                if(identity.address == _identity.address) {
                  user.get("identity").put(did,statsUpdate);
                } else {
                  const delegationJWT = await _encryptWithPublicKey(_identity.publicKey,await _buildJWTDid(_identity,_identity.address));
                  gun.get("did:ethr:6226:"+_identity.address+":delegates").put({did:delegationJWT},statsUpdate);
                }
                gun.get("identities").get(_identity.address).put(did,statsUpdate);
                gun.get("did:ethr:6226:"+_identity.address).put(did,statsUpdate);
                gun.get(_identity.address).put(did,statsUpdate);
                gun.get("did:ethr:6226:"+_identity.address).on(async function(ack) {
                   emitter.emit("did:ethr:6226:"+_identity.address,"Published Identity Update");
                   _publishIdentity(_identity);
                });

            } catch(e) {
              console.log('_publishIdentity()',e);
            }
          }
        return;
    }

    const identityPing = async function(_identity) {
      try {
            let ping = {};
            ping[identity.address] = new Date().getTime();
            gun.get("did:ethr:6226:"+_identity.address).get("ping").put(ping);
      } catch(e) {
        consle.log("identityPing()",e);
      }
    }

    const loginUserGun = function(username,password) {
      return new Promise(async function(resolve, reject) {
        user.auth(username, password, function(ack){
          if(typeof ack.err !== 'undefined') {
              user.create(username,password,async function(ack2) {
                if(typeof ack2.err !== 'undefined') {
                  reject(ack2.err);
                } else {
                  resolve(await loginUserGun(username,password));
                }
              });
          } else {
            user.recall();
            resolve(ack);
          }
        });
      });
    }

    const provider = new ethers.providers.JsonRpcProvider(config.rpcUrl);
    const wallet = new ethers.Wallet(privateKey,provider);
    const singingKey = new ethers.utils.SigningKey(privateKey);

    if((typeof gun == 'undefined') || (gun == null)) {
      const Gun = require('gun');
      gun = Gun({peers:config.gunPeers});
      if(typeof gun.user == 'undefined') {
        if(typeof SEA !== 'undefined') {
          gun.user = SEA.GUN.User;
        }
      }
    }
    const user = gun.user();
    const emitter = new Events();
    const parent = this;
    let _managedCredentials = {};
    let _subscribedVPs = {}
    let _hasManagedCredentials = false;
    await loginUserGun(wallet.address,privateKey);

    // Initialisation
    const keys = {
      address:wallet.address,
      privateKey:privateKey,
      publicKey:EthCrypto.publicKeyByPrivateKey(privateKey),
      gun:gun.user().is
    }

    const identity = {
      address:keys.address,
      publicKey:keys.publicKey,
      gunPublicKey: keys.gun.pub,
      gunEPublicKey: keys.gun.epub,
      id:"did:ethr:6226:"+keys.address
    };

    let stats = {
      identity:{err:0,ok:0}
    }

    // Did Functions
    const _buildJWTDid = async function(object,_identity) {
      if((typeof _identity == 'undefined') || (_identity == null)) _identity = identity.address;
      object.iat = Math.round(new Date().getTime()/1000);
      try {
        const ethrDid = new EthrDID({identifier:_identity,chainNameOrId:config.chainId,registry:config.registry,rpcUrl:config.rpcUrl,privateKey:keys.privateKey});
        const jwt =  await ethrDid.signJWT(object);
        return jwt;
      } catch(e) {
        console.log('_buildJWTDid',e);
      }
     }

    const _resolveDid = async function(jwt) {
       try {
        if((typeof jwt !== 'string') || (jwt.substr(0,2) !== 'ey')) {
            throw new Error('JWT expected received: '+jwt);
        }
        config.identifier = keys.address;
        const didResolver = new Resolver(getResolver(config));
        const ethrDid = new EthrDID(config);
        const did = await ethrDid.verifyJWT(jwt, didResolver);
        // Might add a private DID Cache here
        if((typeof did.payload !== 'undefined') && (typeof did.payload.address !== 'undefined')) {
            dids[did.payload.address] = did;
        }
        return did;
      } catch(e) {
        console.log('_resolveDid - Master Caution',e);
        // try offline without Resolver!
        let res = jsontokens.decodeToken(jwt)
        return res;
      }
    }

    // Business functions
    const _onceWithData = function(node) {
      return new Promise(function(resolve, reject) {
        node.once(async function(obj) {
            if(typeof obj == 'undefined') {
              setTimeout(function() {
                resolve(_onceWithData(node));
              },100);
            } else {
              const did = await _resolveDid(obj.did);
              emitter.emit("raw:"+did.issuer,did);
              resolve(did.payload);
            }
        });
      });
    }

    const _onceWithEncryption = function(node) {
      return new Promise(function(resolve, reject) {
        node.once(async function(obj) {
            if(typeof obj == 'undefined') {
              setTimeout(function() {
                resolve(_onceWithEncryption(node));
              },100);
            } else {
              resolve(obj);
            }
        });
      });
    }

    const _publishGlobal = async function(node) {
          gun.get("global").set(node);
    }

    const getIdentity = async function(address) {
      const node1 = gun.get("identities").get(address);
      const node2 = gun.get(address);
      let res1 = _onceWithData(node1);
      let res2 = _onceWithData(node2);
      if(typeof Promise.any == 'function') {
        return await Promise.any([res1,res2]);
      } else {
        return await res2;
      }

    }

    const _devFunding = function(account) {
      return new Promise(async function(resolve, reject) {
      try {
        // console.log('Ensure Funding',account);
         let balance = await provider.getBalance(account);
         if(balance < 2023100000000000) {
               https.get('https://api.corrently.io/v2.0/idideal/devmode?account='+account,function(res) {
                  resolve(res);
               });
         } else {
           resolve(balance);
         }
       } catch(e) {
         console.log('_devFunding()',e);
         resolve();
       }
      });
    }

    const createManagedPresentation = async function() {
      try {
        const tmpWallet = ethers.Wallet.createRandom();
        const tmpPrivateKey = tmpWallet.privateKey;

        const mcKeys = {
          address:tmpWallet.address,
          publicKey:EthCrypto.publicKeyByPrivateKey(tmpPrivateKey),
          privateKey:tmpPrivateKey
        }
        emitter.emit("cMP","Created new DID address: "+tmpWallet.address);
        const mcIdentity = {
          id:"did:ethr:6226:"+mcKeys.address,
          address:mcKeys.address,
          publicKey:mcKeys.publicKey,
          creator:identity.address
        }

       const _wallet =  new ethers.Wallet(mcKeys.privateKey,provider);
       const registry = new ethers.Contract( config.registry , config.abi , _wallet );
       await _publishIdentity(mcIdentity);
        emitter.emit("cMP","Public Announced Identity: "+mcIdentity.address);
       // We need to wait for Funds here!

       const doOwnerChange = async function() {
         emitter.emit("cMP","Assign Ownership to: "+identity.address);
         try {
            emitter.emit("cMP","Ensure Funding");
           await _devFunding(mcIdentity.address);
           await sleep(500);
           await wallet.sendTransaction({
             to: mcIdentity.address,
             value: ethers.utils.parseEther("0.001")
           });
           emitter.emit("cMP","Transfer Funding");
           let balance = await provider.getBalance(mcIdentity.address);
           while(balance < 100) {
              await sleep(500);
              balance = await provider.getBalance(mcIdentity.address);
           }
            emitter.emit("cMP","Consensus Transaction: Change Ownership");
           const res = await registry.changeOwner(_wallet.address,identity.address);
         } catch(e) {
           setTimeout(function() {
             console.log("Pending DID Owner Change!");
             doOwnerChange();
           },1000);
         }
       }
       emitter.emit("cMP","Event Subscribe to new Presentation address");
       await doOwnerChange();
       // Wait to get verified Ownership
       let nOwner = await identityOwner(mcIdentity.address);
       let emitted = false;
       while(nOwner !== identity.address) {
         if(!emitted) {
           emitter.emit("cMP","Wait for Consensus of Ownership");
           emitted = true;
         }
         await sleep(1500);
         nOwner = await identityOwner(mcIdentity.address);
       }
       const encCred = await _encryptWithPublicKey(identity.publicKey,mcKeys.privateKey);
       try {
         gun.get(identity.address).get("ManagedCredentials").get(mcIdentity.address).put(await _buildJWTDid({private:encCred}));
         emitter.emit("cMP","Published to Managed Credentials");
         _managedCredentials[mcIdentity.address] = {
           id:"did:ethr:6226:"+mcIdentity.address,
           address:mcIdentity.address,
           privateKey:mcKeys.privateKey,
           publicKey:mcKeys.publicKey,
           owner:mcIdentity.address,
           belongsThis:true,
           delegateThis:true
         }
         await sleep(500); // Wait shortly to allow RAD to save!
       } catch(e) {
         console.log('createManagedPresentation():identity',e);
       }
         _subscribeVP(mcIdentity.address);
         return mcIdentity;
       } catch(e) {
         console.log('createManagedPresentation()',e);
       }
    }

    const _subscribeVP = async function(address) {
      if(typeof _subscribedVPs[address] == 'undefined') {
          gun.get("did:ethr:6226:"+address+":"+identity.address).on(async function(ack) {
             emitter.emit("did:ethr:6226:"+address+":"+identity.address,await retrievePrivateVP(address));
          });

          gun.get("did:ethr:6226:"+address+":delegates").on(async function(ack) {
            try {
             emitter.emit("did:ethr:6226:"+address+":delegates",await retrieveDelegationVP(address));
           } catch(e) {
             // caused if ssi does not have any managed childs
           }
          });

          gun.get("did:ethr:6226:"+address).on(async function(ack) {
            if(_subscribedVPs[address] !== JSON.stringify(ack)) {
              _subscribedVPs[address] = JSON.stringify(ack)
             emitter.emit("jwt:ethr:6226:"+address,ack.did);
             emitter.emit("did:ethr:6226:"+address,await retrieveVP(address));
             if((typeof ack._revision !== 'undefined') && (typeof ack._successor !== 'undefined')) {
               gun.get("did:ethr:6226:"+address).get(ack._successor).on(async function(ackS) {
                 emitter.emit("jwt:ethr:6226:"+address,ackS.did);
                 emitter.emit("did:ethr:6226:"+address,await retrieveVP(address,ack._revision));
               });
             }
            }
          });
          _subscribedVPs[address] = new Date().getTime();
      }
    }

    const updateVP = async function(address,publicData,groupData,privateData) {
        if(identity.address == '0x6f7197B17384Ac194eE0DfaC444D018F174C4553') {
          console.log("Warning: View only key in CRUD Operation");
          return;
        } {
          try {
            const statsUpdate = function(ack) {
                if(typeof stats.vps == 'undefined') stats.vps = {};
                if(typeof stats.vps[address] == 'undefined') stats.vps[address] = { ok:0,err:0};
                if(typeof ack.err == 'undefined') { stats.vps[address].ok++; } else { stats.vps[address].err++; }
            }
            const tmpWallet = ethers.Wallet.createRandom();
            if(typeof publicData._ancestor !== 'undefined') {
                publicData._revision = publicData._ancestor;
                delete publicData._ancestor;
            } else {
                const tmpWallet2 = ethers.Wallet.createRandom();
                publicData._revision = tmpWallet2.address;
            }
            publicData._successor = tmpWallet.address;
            const publicJWT = await _buildJWTDid(publicData,address);
            gun.get("did:ethr:6226:"+address).put({did:publicJWT,_successor:publicData._successor,_revision:publicData._revision},statsUpdate);
            gun.get("did:ethr:6226:"+address).get(publicData._revision).put({did:publicJWT,_successor:publicData._successor,_revision:publicData._revision},statsUpdate);
            _publishGlobal( gun.get("did:ethr:6226:"+address));
            await sleep(200);
            retrieveVP(address);
            if((typeof groupData !== 'undefined') && (groupData !== null)) {
              let groupId = await getIdentity(address);
              const delegationJWT = await _encryptWithPublicKey(groupId.publicKey,await _buildJWTDid(groupData,address));
              gun.get("did:ethr:6226:"+address+":delegates").put({did:delegationJWT},statsUpdate);
              const privateJWT = await _encryptWithPublicKey(identity.publicKey,await _buildJWTDid(privateData,address));
              gun.get("did:ethr:6226:"+address+":"+identity.address).put({did:privateJWT},statsUpdate);
            }
          } catch(e) {
            console.log('updateVP()',e);
          }
      }
    }

    const republish = async function(address,publicJWT) {
      gun.get("did:ethr:6226:"+address).put({did:publicJWT});
    }

    const identityOwner = async function(address) {
      const registry = new ethers.Contract( config.registry , config.abi , wallet );
      let res = await registry.identityOwner(address);
      return res;
    }

    const validDelegate = async function(_identity) {
      const registry = new ethers.Contract( config.registry , config.abi , wallet );
      let res = await registry.validDelegate(_identity,"0x766572694b657900000000000000000000000000000000000000000000000000",identity.address);
      return res;
    }

    const retrieveVP = async function(address,revision) {
      let node = gun.get("did:ethr:6226:"+address);
      if((typeof revision !== 'undefined') && (revision !== null)) {
        node = gun.get("did:ethr:6226:"+address).get(revision);
      }
      let data = await _onceWithData(node);
      _subscribeVP(address);
      let delegatedToMe = await validDelegate(address);
      if(delegatedToMe) {
          let mnode = await _onceWithEncryption(gun.get(identity.address).get("ManagedCredentials").get(address));
          await retrieveDelegationVP(address);

      }
      return data;
    }

    const retrievePrivateVP = async function(address) {
      const node = gun.get("did:ethr:6226:"+address+":"+identity.address).get("did");
      const data = await _onceWithEncryption(node);
      const did = await _resolveDid(await _decryptWithPrivateKey(keys.privateKey,data));
      return did.payload;
    }

    const retrieveDelegationVP = async function(address) {
      if(typeof _managedCredentials[address] == 'undefined') {
        return {};
      } else {
        try {
          const node = gun.get("did:ethr:6226:"+address+":delegates").get("did");
          const data = await _onceWithEncryption(node);
          const did = await _resolveDid(await _decryptWithPrivateKey(_managedCredentials[address].privateKey,data));
          return did.payload;
        } catch(e) {
          console.log("retrieveDelegationVP",e);
        }
      }
    }

    const delegate = async function(_identity,to,duration) {
        if((typeof duration == 'undefined')||(duration==null)) duration = 86400000*365;
        emitter.emit("delegation",'Wait Managed Credentials');
        identityPing(to); // need to be done in order to ensure we are able to retrieve Identity with getIdentity(to);
        await waitManagedCredentials();
        if(typeof _managedCredentials[_identity] == 'undefined') throw "Unable to delegate - not managed";
        emitter.emit("delegation",'Ensured is Managed Credential');
        const delegateId = await getIdentity(to); // TODO - Here we need to "ping" other party to ensure it republishs!
        emitter.emit("delegation",'Received target Identity');
        if((typeof delegateId == 'undefined')||(delegateId == null)) throw "Unable to retrieve Public Key from graph";
        try {
          const registry = new ethers.Contract( config.registry , config.abi , wallet );
          emitter.emit("delegation","Prepared Consensus Transaction");
          let res = await registry.addDelegate(_identity,"0x766572694b657900000000000000000000000000000000000000000000000000",to,duration);
          emitter.emit("delegation","Consensus Tx Hash "+res.hash);
          await sleep(500);
          const encCred = await _encryptWithPublicKey(delegateId.publicKey,_managedCredentials[_identity].privateKey);
          try {
              const encJWT = await _buildJWTDid({private:encCred});
              gun.get(to).get("ManagedCredentials").get(_identity).put(encJWT);
              gun.get(_identity).get(to).put(encJWT);

          } catch(e) {
              console.log('delegate():identity',e);
          }
          return res;
        } catch(e) {
          console.log("delegate()",e);
        }
    }

    const revoke = async function(_identity,to) {
      try {
        const registry = new ethers.Contract( config.registry , config.abi , wallet );
        emitter.emit("revokeTx","Prepared Consensus Transaction");
        let res = await registry.revokeDelegate(_identity,"0x766572694b657900000000000000000000000000000000000000000000000000",to);
        emitter.emit("revokation",res);
        console.log("BC Revoke Result",res);
        return res;
      } catch(e) {
        console.log("revoke()",e);
      }
    }

    const _getAliasesDid = async function() {
      let node = gun.get(identity.address).get("AddressBook");
      const data = await _onceWithEncryption(node);
      const did = await _resolveDid(await _decryptWithPrivateKey(keys.privateKey,data));
      return JSON.parse(did.aliases);
    }

    const getIdentityAlias = async function(_identity) {
      let _identityObj = await getIdentity(_identity);
      const aliases = await _getAliasesDid();
      if(typeof aliases[_identity] !== 'undefined') _identityObj = aliases[_identity];
      return _identityObj;
    }

    const setIdentityAlias = async function(_identity,_alias) {
      let _identityObj = await getIdentity(_identity);
      _identityObj.alias = _alias;
      const oldAliases = await _getAliasesDid();
      if((typeof oldAlias == 'undefined') || (oldAlias == null )) oldAlias = {};
      oldAlias[_identity] = _identityObj;
      const encDid = await _encryptWithPublicKey(identity.publicKey,JSON.stringify(oldAliases));
      gun.get(identity.address).get("AddressBook").put(await _buildJWTDid({aliases:encDid}));
    }

    const discoverManagedCredentials = async function() {
      gun.get(identity.address).get("ManagedCredentials").map().on(async function(v,k) {
          _managedCredentials[k] = await _resolveDid(v);
          const pk = await _decryptWithPrivateKey(keys.privateKey,_managedCredentials[k].payload.private);
          const owner = await identityOwner(k);
          let belongsThis = false;
          if(identity.address == owner) belongsThis=true;
          let delegateThis = await validDelegate(k);
          _hasManagedCredentials = true;

          _managedCredentials[k] = {
            id:"did:ethr:6226:"+k,
            address:k,
            privateKey:pk,
            publicKey:EthCrypto.publicKeyByPrivateKey(pk),
            owner:k,
            belongsThis:belongsThis,
            delegateThis:delegateThis
          }
      });
    }


    const subscribeGlobal = async function() {
      gun.get("global").on(async function(ack) {
        for (const [key, value] of Object.entries(ack)) {
            if(key.length > 1) {
               _subscribeVP(key);
            }
        }
      });
    }
    const waitManagedCredentials = async function() {
      while(_hasManagedCredentials == false) {
         emitter.emit("wMC","Waiting for Managed Credentials");
        await sleep(500);
      }
    }

    const reSubscribe = async function() {
      if(typeof _subscribedVPs !== 'undefined') {
        for (const [key, value] of Object.entries(_subscribedVPs)) {
             delete _subscribedVPs[key];
            _subscribeVP(key);
        }
      }
    }

    // Bootstrapping
    _publishIdentity(identity);
    discoverManagedCredentials();
    await _devFunding(identity.address);

    setInterval(reSubscribe,90000);

    return {
      wallet: wallet,
      identity: identity,
      gun:gun,
      emitter:emitter,
      stats:stats,
      getIdentity:getIdentity,
      collectedDIDs:dids,
      createManagedPresentation:createManagedPresentation,
      managedCredentials:_managedCredentials,
      updateVP:updateVP,
      retrieveVP:retrieveVP,
      retrieveDelegationVP:retrieveDelegationVP,
      delegate:delegate,
      revoke:revoke,
      subscribeGlobal:subscribeGlobal,
      identityOwner:identityOwner,
      setIdentityAlias:getIdentityAlias,
      getIdentityAlias:setIdentityAlias,
      validDelegate:validDelegate,
      waitManagedCredentials:waitManagedCredentials,
      resolveJWTDID:_resolveDid,
      buildJWTDid:_buildJWTDid,
      republishDID:republish,
      identityPing:identityPing
    }
  }
}

module.exports=TydidsP2P
