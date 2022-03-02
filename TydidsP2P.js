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
    const PACKAGE = require("./package.json");
    const VERSION = PACKAGE.version;

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
                gun.get("did:ethr:6226:"+_identity.address+":identity").put(did,statsUpdate);
                gun.get(_identity.address).put(did,statsUpdate);
                gun.get("did:ethr:6226:"+_identity.address+":identity").on(async function(ack) {
                   emitter.emit("did:ethr:6226:"+_identity.address,"Published Identity Update");
                   _publishIdentity(_identity);
                });

            } catch(e) {
              console.log('_publishIdentity()',e);
            }
          }
        return;
    }

    const _publishPresentation  = async function(address,_identity) {
      _identity.updated = new Date().getTime();
      if((typeof piLog[_identity.address] == 'undefined') || (piLog[_identity.address] < _identity.updated - 5000)) {
          piLog[_identity.address] = _identity.updated;
            try {
                const statsUpdate = function(ack) {
                    if(typeof ack.err == 'undefined') { stats.identity.ok++; } else { stats.identity.err++; }
                }
                const jwt = await _buildJWTDid(_identity,_identity.address);
                const did = {jwt:jwt,uri:"did:ethr:6226:"+_identity.address};
                gun.get("did:ethr:6226:"+_identity.address+":identity").put(did,statsUpdate);
                gun.get("did:ethr:6226:"+_identity.address+":identity").on(async function(ack) {
                   emitter.emit("did:ethr:6226:"+_identity.address,"Published Presentation Identity Update");
                   _publishPresentation(address,_identity);
                });
            } catch(e) {
              console.log('_publishPresentation()',e);
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
    let _managedPresentations = {};
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
      object._address = _identity;
      try {
        const ethrDid = new EthrDID({identifier:_identity,chainNameOrId:config.chainId,registry:config.registry,rpcUrl:config.rpcUrl,privateKey:keys.privateKey});
        const jwt =  await ethrDid.signJWT(object);
        return jwt;
      } catch(e) {
        console.log('_buildJWTDid',e);
      }
     }

    const _resolveDid = async function(jwt,revision) {
       try {
        if((typeof jwt !== 'string') || (jwt.substr(0,2) !== 'ey')) {
            throw new Error('JWT expected received: '+jwt);
        }
        config.identifier = keys.address;
        const didResolver = new Resolver(getResolver(config));
        const ethrDid = new EthrDID(config);
        const did = await ethrDid.verifyJWT(jwt, didResolver);
        if(((typeof did.payload !== 'undefined') && (typeof did.payload._address !== 'undefined'))||(typeof did._address !== 'undefined')) {
             if(typeof did.payload !== 'undefined') { did.payload._revision = revision; }
            if(typeof did._address !== 'undefined') {
              dids[did._address] = did;
              gun.get(did._address+":"+identity.address).put({iat:did.payload.iat,rcpt:Math.round(new Date().getTime()/1000),revision:revision});
            } else {
              dids[did.payload._address] = did;
              gun.get(did.payload._address+":"+identity.address).put({iat:did.payload.iat,rcpt:Math.round(new Date().getTime()/1000),revision:revision});
            }
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
    const _onceWithData = function(node,address) {
      return new Promise(function(resolve, reject) {
        node.once(async function(obj) {
            if(typeof obj == 'undefined') {
              setTimeout(function() {
                resolve(_onceWithData(node));
              },100);
            } else {
              try {
                const did = await _resolveDid(obj.public,obj.revision);
                if((typeof did !== 'undefined') && (typeof did.issuer !== 'undefined')) {
                  emitter.emit("raw:"+did.issuer,did);
                }
                if(typeof did !== 'undefined') {
                  resolve(did.payload);
                } else {
                  resolve({});
                }
              } catch(e) {
                  console.log('_onceWithData - Master Caution',e,obj);
                  resolve({});
              }
            }
        });
      });
    }

    const _onceWithNode = function(node) {
      return new Promise(function(resolve, reject) {
        node.once(async function(obj) {
            if(typeof obj == 'undefined') {
              setTimeout(function() {
                resolve(_onceWithNode(node));
              },100);
            } else {
              resolve(obj);
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

    const _developmentFunding = function(account) {
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
         console.log('_developmentFunding()',e);
         resolve();
       }
      });
    }

    const createPresentation = async function() {
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
          creator:identity.address,
          version:VERSION
        }

       const _wallet =  new ethers.Wallet(mcKeys.privateKey,provider);
       const registry = new ethers.Contract( config.registry , config.abi , _wallet );

       await _publishPresentation(mcIdentity.address,mcIdentity);
        emitter.emit("cMP","Public Announced Identity: "+mcIdentity.address);

       const doOwnerChange = async function() {
         emitter.emit("cMP","Assign Ownership to: "+identity.address);
         try {
            emitter.emit("cMP","Ensure Funding");
           await _developmentFunding(mcIdentity.address);
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
       const tmpWalletPresentation = ethers.Wallet.createRandom();

       const publicJWT = await _buildJWTDid({},mcIdentity.address);

       gun.get(mcIdentity.address).put( {
         public:publicJWT,
         revision:mcIdentity.address,
         successor:tmpWalletPresentation.address,
         identity: mcIdentity,
         version:VERSION
       });
       try {
         gun.get(identity.address).get("ManagedCredentials").get(mcIdentity.address).put(await _buildJWTDid({private:encCred}));
         emitter.emit("cMP","Published to Managed Credentials");
         _managedPresentations[mcIdentity.address] = {
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
         console.log('createPresentation():identity',e);
       }
         _subscribePresentation(mcIdentity.address);
         return mcIdentity;
       } catch(e) {
         console.log('createPresentation()',e);
       }
    }

    const _subscribePresentation = async function(address) {
      if(typeof _subscribedVPs[address] == 'undefined') {
          gun.get(address).on(async function(ack) {
            if(_subscribedVPs[address] !== JSON.stringify(ack)) {
              _subscribedVPs[address] = JSON.stringify(ack)
             emitter.emit("jwt:ethr:6226:"+address,ack.public);
             emitter.emit("did:ethr:6226:"+address,await retrievePresentation(address));
             if((typeof ack.revision !== 'undefined') && (typeof ack.successor !== 'undefined')) {
               gun.get(address).get(ack.successor).on(async function(ackS) {
                 emitter.emit("jwt:ethr:6226:"+address,ackS.public);
                 emitter.emit("did:ethr:6226:"+address,await retrievePresentation(address,ack._revision));
               });
             }
            }
          });
          _subscribedVPs[address] = new Date().getTime();
      }
    }

    const retrievePresentation = async function(address,revision) {
      let node = gun.get(address);
      if((typeof revision !== 'undefined') && (revision !== null)) {
        node = gun.get(address).get(revision);
      }
      let meta = await _onceWithNode(node);
      let data = await _onceWithData(node,address);
      _subscribePresentation(address);
      if(typeof meta.successor !== 'undefined') {
        if(typeof revisions[meta.successor] == 'undefined') {
          revisions[meta.successor]  = new Date().getTime();
          let successor = gun.get(address).get(revisions[meta.successor]);
          retrievePresentation(address,successor); // no await, as this is a later emittor
        }
      }

      emitter.emit("jwt:ethr:6226:"+address,meta.public);
      emitter.emit("did:ethr:6226:"+address,data);

      let delegatedToMe = await validDelegate(address);
      if(delegatedToMe) {
          let mnode = await _onceWithEncryption(gun.get(identity.address).get("ManagedCredentials").get(address));
          await retrieveDelegationVP(address);

      }
      return data;
    }

    const updatePresentation = async function(address,publicData,extendMode) {
         if((typeof extendMode == 'undefined') || (extendMode ==null)) {
           extendMode = false;
         }
         if(extendMode == 'on') extendMode = true;
         if(extendMode == 'off') extendMode = false;
         if(extendMode == 'false') extendMode = false;

         if(identity.address == '0x6f7197B17384Ac194eE0DfaC444D018F174C4553') {
          console.log("Warning: View only key in CRUD Operation");
          return;
        } else {
          try {
            let node = gun.get(address);
            let el = await _onceWithNode(node); // Caution: No Revision Check!
            if(extendMode) {
               let oldObject = await _onceWithData(node);
               for (const [key, value] of Object.entries(publicData)) {
                  oldObject[key] = value;
              }
              publicData = oldObject;
            }

            const statsUpdate = function(ack) {
                if(typeof stats.vps == 'undefined') stats.vps = {};
                if(typeof stats.vps[address] == 'undefined') stats.vps[address] = { ok:0,err:0};
                if(typeof ack.err == 'undefined') { stats.vps[address].ok++; } else { stats.vps[address].err++; }
            }

            const tmpWallet = ethers.Wallet.createRandom();
            const publicJWT = await _buildJWTDid(publicData,address);

            el.ancestor = el.revision;
            el.revision = el.successor;
            el.successor = tmpWallet.address;
            el.public = publicJWT;
            console.log("New Revision",el.revision);
            gun.get(address).put(el,statsUpdate);
            gun.get(address).get(el.revision).put(el,statsUpdate);

            await sleep(200);

            retrievePresentation(address,el.revision);
            retrievePresentation(address);
            /* removed for v0.9 release
            if((typeof groupData !== 'undefined') && (groupData !== null)) {
              let groupId = await getIdentity(address);
              const delegationJWT = await _encryptWithPublicKey(groupId.publicKey,await _buildJWTDid(groupData,address));
              gun.get("did:ethr:6226:"+address+":delegates").put({did:delegationJWT},statsUpdate);
              const privateJWT = await _encryptWithPublicKey(identity.publicKey,await _buildJWTDid(privateData,address));
              gun.get("did:ethr:6226:"+address+":"+identity.address).put({did:privateJWT},statsUpdate);
            }
            */
            return el;
          } catch(e) {
            console.log('updatePresentation()',e);
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

    const retrievePrivateVP = async function(address) {
      const node = gun.get("did:ethr:6226:"+address+":"+identity.address).get("did");
      const data = await _onceWithEncryption(node);
      const did = await _resolveDid(await _decryptWithPrivateKey(keys.privateKey,data));
      return did.payload;
    }

    const retrieveDelegationVP = async function(address) {
      if(typeof _managedPresentations[address] == 'undefined') {
        return {};
      } else {
        try {
          const node = gun.get("did:ethr:6226:"+address+":delegates").get("did");
          const data = await _onceWithEncryption(node);
          const did = await _resolveDid(await _decryptWithPrivateKey(_managedPresentations[address].privateKey,data));
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
        await waitManagedPresentations();
        if(typeof _managedPresentations[_identity] == 'undefined') throw "Unable to delegate - not managed";
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
          const encCred = await _encryptWithPublicKey(delegateId.publicKey,_managedPresentations[_identity].privateKey);
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

    const discoverManagedPresentations = async function() {
      gun.get(identity.address).get("ManagedCredentials").map().on(async function(v,k) {
          _managedPresentations[k] = await _resolveDid(v);
          const pk = await _decryptWithPrivateKey(keys.privateKey,_managedPresentations[k].payload.private);
          const owner = await identityOwner(k);
          let belongsThis = false;
          if(identity.address == owner) belongsThis=true;
          let delegateThis = await validDelegate(k);
          _hasManagedCredentials = true;

          _managedPresentations[k] = {
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
               _subscribePresentation(key);
            }
        }
      });
    }
    const waitManagedPresentations = async function() {
      while(_hasManagedCredentials == false) {
         emitter.emit("wMC","Waiting for Managed Credentials");
        await sleep(500);
      }
    }

    const reSubscribe = async function() {
      if(typeof _subscribedVPs !== 'undefined') {
        for (const [key, value] of Object.entries(_subscribedVPs)) {
             delete _subscribedVPs[key];
            _subscribePresentation(key);
        }
      }
    }

    // Bootstrapping
    _publishIdentity(identity);
    discoverManagedPresentations();
    await _developmentFunding(identity.address);

    setInterval(reSubscribe,90000);

    return {
      wallet: wallet,
      identity: identity,
      gun:gun,
      emitter:emitter,
      stats:stats,
      getIdentity:getIdentity,
      collectedDIDs:dids,
      createPresentation:createPresentation,
      managedCredentials:_managedPresentations,
      updatePresentation:updatePresentation,
      retrievePresentation:retrievePresentation,
      retrieveDelegationVP:retrieveDelegationVP,
      delegate:delegate,
      revoke:revoke,
      subscribeGlobal:subscribeGlobal,
      identityOwner:identityOwner,
      setIdentityAlias:getIdentityAlias,
      getIdentityAlias:setIdentityAlias,
      validDelegate:validDelegate,
      waitManagedPresentations:waitManagedPresentations,
      resolveJWTDID:_resolveDid,
      buildJWTDid:_buildJWTDid,
      republishDID:republish,
      identityPing:identityPing,
      version:VERSION
    }
  }
}

module.exports=TydidsP2P
