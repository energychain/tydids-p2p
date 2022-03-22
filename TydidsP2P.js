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
/**
  * TyDIDs-P2P
  * Data Identity Framework
**/
const TydidsP2P = {
  jsontokens:jsontokens,
  ethers:ethers,
  encryptWithPublicKey:_encryptWithPublicKey,
  decryptWithPrivateKey:_decryptWithPrivateKey,
  createPrivateKey:function() {
      const wallet = ethers.Wallet.createRandom();
      return wallet.privateKey;
  },
  ssi:async function(privateKey,doReset,gun,_listenServerPort,_peers,config) {
    if((typeof doReset == 'undefined') || (doReset == null)) { doReset = true; }

    if((typeof privateKey == 'undefined') || (privateKey == null)) {
      privateKey = '0x52a3442496ba4cd6444ddd147855725741bc385e93d08d66c62d01a7347531b7'; // view Only Key! Do not Delegate to 0x6f7197B17384Ac194eE0DfaC444D018F174C4553
    }

    const EthrDID = require("ethr-did").EthrDID;
    const getResolver = require('ethr-did-resolver').getResolver;
    const Resolver = require('did-resolver').Resolver;
    const PACKAGE = require("./package.json");
    const VERSION = PACKAGE.version;
    const _subs = {};
    let lwait = 500;
    const _RETRIEVEWAIT = 1000;
    const _WAITACK = 60000; // how long to wait for ACK message
    let _cbACK = null;
    let _cbRcvdACK = null;
    const instanceID = Math.random();

    const node = {
      presentation:null,
      revision:null,
      successor:null,
      ancestor:null,
      identity:null
    }
    if((typeof config == 'undefined') || (config == null)) {
      config = {
        rpcUrl: "https://rpc2.tydids.com/",
        name: "mainnet",
        chainId: "6226",
        registry:"0xaC2DDf7488C1C2Dd1f8FFE36e207D8Fb96cF2fFB",
        abi:require("./EthereumDIDRegistry.abi.json"),
        idabi:require("./EthereumIDRoleRegistry.abi.json"),
        idregistry:"0x380753155B8ad0b903D85E9F08233a0359369568",
        gunPeers:['http://relay.tydids.com:8888/','http://relay2.tydids.com:8888/','http://relay3.tydids.com:8888/','http://relay4.tydids.com:8888/'],
        relays:[]
      }
    }

    class Events extends EventEmitter {
      constructor(config) {
         super();
      }
    }

    const _getRandomAddress = function() {
      const wallet = ethers.Wallet.createRandom();
      return wallet.address;
    }

    const loginUserGun = function(username,password) {
    return new Promise(async function(resolve, reject) {
      user.auth(username, password, async function(ack){
        if(typeof ack.err !== 'undefined') {
          try {
      if(ack.err == 'Wrong user or password.') {
        username += '_'+instanceID;
      }
            user.create(username,password,async function(ack2) {
      await sleep(200);
              if(typeof ack2.err !== 'undefined') {
                reject(ack2.err);
              } else {
                resolve(await loginUserGun(username,password));
              }
            });
          } catch(e) {
              await sleep(500);
              resolve(await loginUserGun(username,password));
          }
        } else {
          user.recall();
          if(doReset) {
            node.presentation = "";
            node.revision = identity.address;
            node.successor = _getRandomAddress();
            node.ancestor = null;
            resolve(node);
          } else {
            gun.get(identity.address).once(function(_node) {
              try {
                node.presentation = _node.presentation;
                node.revision = _node.revision;
                node.successor = _node.successor;
                node.ancestor = _node.ancestor;
                node.identity = identity;
                resolve(node);
              } catch(e) {
                node.presentation = "";
                node.revision = identity.address;
                node.successor = _getRandomAddress();
                node.ancestor = null;
                resolve(node);
              }
            });
          }
        }
      });
    });
  }

    const provider = new ethers.providers.JsonRpcProvider(config.rpcUrl);
    const wallet = new ethers.Wallet(privateKey,provider);
    const singingKey = new ethers.utils.SigningKey(privateKey);
    let _gunOpts = {peers:[],radisk:false};
    for(let i=0;i<config.gunPeers.length;i++) {
      _gunOpts.peers.push(config.gunPeers[i]+'gun');
    }
    if((typeof _peers !== 'undefined') && (_peers !== null)) {
      for(let i=0;i<_peers.length;i++) {
        config.gunPeers.push(_peers[i]);
      }
    }
    if((typeof _listenServerPort !== 'undefined') && ( _listenServerPort !== null)) {
      const server = require('http').createServer(function(req,res) {
        if(req.url.length == 43) {
            retrievePresentation(req.url.substr(1,42)).then(function(data) {
              res.writeHead(200, {'Content-Type': 'text/json'});
              res.write(JSON.stringify(data))
              res.end();
            });
        }
      }).listen(_listenServerPort);
      _gunOpts.web = server;
    }
    _gunOpts.file ="radata_"+wallet.address;

    if((typeof gun == 'undefined') || (gun == null)) {
      const Gun = require('gun');
      require('gun/lib/load.js');
      gun = Gun(_gunOpts);
      if(typeof gun.user == 'undefined') {
        if(typeof SEA !== 'undefined') {
          gun.user = SEA.GUN.User;
        }
      }
    }
    const user = gun.user();
    const emitter = new Events();
    const parent = this;

    const keys = {
      address:wallet.address,
      privateKey:privateKey,
      publicKey:EthCrypto.publicKeyByPrivateKey(privateKey),
    }

    const identity = {
      address:keys.address,
      owner:keys.address,
      publicKey:keys.publicKey,
      id:"did:ethr:6226:"+keys.address
    };

    // Dummy Login
    await loginUserGun(wallet.address,privateKey);
    keys.gun = gun.user().is;
    identity.gunPublicKey = keys.gun.pub;
    identity.gunEPublicKey = keys.gun.epub;
    node.identity = identity;


    // Internal Management

    let stats = {
      identity:{err:0,ok:0}
    }

    // Internal Functions
    const _resolveDid = async function(jwt,_rtry) {
      if((typeof _rtry == 'undefined') || (_rtry == null)) _rtry = 0;

       try {
        if((typeof jwt !== 'string') || (jwt.substr(0,2) !== 'ey')) {
            return {payload:{}};
        } else {
          config.identifier = keys.address;
          const didResolver = new Resolver(getResolver(config));
          const ethrDid = new EthrDID(config);
          const did = await ethrDid.verifyJWT(jwt, didResolver);
          return did;
        }
      } catch(e) {
        if(config.rpcUrl == "https://rpc2.tydids.com/") {
          config.rpcUrl = "https://rpc.tydids.com/";
        } else {
          config.rpcUrl = "https://rpc2.tydids.com/";
        }
        if(_rtry == 0) {
          return await _resolveDid(jwt,_rtry++);
        } else {
          console.log('_resolveDid - Master Caution',e);
          let res = jsontokens.decodeToken(jwt)
          return res;
        }
      }
    }

    const _buildJWTDid = async function(object,_identity) {
      if((typeof object == 'undefined') || (object == null)) object = {};
        if((typeof _identity == 'undefined') || (_identity == null)) _identity = identity.address;
        object.iat = Math.round(new Date().getTime()/1000);
        object._address = _identity;
        object._revision = node.revision;
        try {
          const ethrDid = new EthrDID({identifier:_identity,chainNameOrId:config.chainId,registry:config.registry,rpcUrl:config.rpcUrl,privateKey:keys.privateKey});
          const jwt =  await ethrDid.signJWT(object);
          return jwt;
        } catch(e) {
          console.log('_buildJWTDid',e);
        }

    }

    const _updateGraph = async function() {
      gun.get(identity.address).put(node);
      gun.get(identity.address).get(node.revision).put(node);
      gun.get(node.revision).put(node);
      gun.get("relay").get(identity.address).put(node);
      gun.get("relay").get(node.revision).put(node);
      await sleep(200);
      for(let i=0;((i<config.gunPeers.length)&&(i<5));i++) {
        try {
          https.get(config.gunPeers[i]+'json/'+identity.address,function(res) {});
          await sleep(100);
        } catch(e) {
        }
      }
    }

    const _inGraphRetrieveOnce = async function(address,_revision,_wait) {
      return new Promise(async function(resolve, reject) {
        let option = null;
        if((typeof _wait !== 'undefined') && (_wait !== null)) {
          option = { wait:_wait};
        } else {
          option = { wait:_RETRIEVEWAIT};
        }
          if((typeof _revision == 'undefined') || (_revision == null)) {
            gun.get(address).once(function(_node) {
              resolve(_node);
            },option);
          } else {
            gun.get(address).get(_revision).once(function(_node) {
                resolve(_node);
            },option);
            gun.get(_revision).once(function(_node) {
                resolve(_node);
            },option);
          }
      });
    }
    const _inGraphLoad = async function(address,rn) {
      return new Promise(async function(resolve, reject) {
            let resolved = false;
            if((typeof rn == 'undefined') || (rn == null)) rn = gun.get(address);
            rn.load(async function(_node) {
              for (const [key, value] of Object.entries(_node)) {
                _node[key] = await _inGraphLoad(address,rn.get(key));
              }
              resolved = true;
              resolve(_node);
            });
            setTimeout(function() {
              if(!resolved) resolve({});
            },5000);
      });
    }

    const _retrievePresentationJWT = async function(address,_revision) {
      return new Promise(async function(resolve, reject) {
            if((typeof _revision == 'undefined') || (_revision == null)) {
              if(address == node.identity.address) {
                _revision = node.revision;
              }
            }
            let inGraph = await _inGraphRetrieveOnce(address,_revision);
            resolve(inGraph)
      });
    }

    // Public functions

    /**
     * Updates Presentation controlled by this SSI
     * @function async updatePresentation
     * @params {Object} fields/data to set
    */
    const updatePresentation = async function(payload) {
        const _presentation = await _resolveDid(node.presentation);
        // merge
        if(typeof _presentation.payload == 'undefined') _presentation.payload = {};

        for (const [key, value] of Object.entries(payload)) {
           _presentation.payload[key] = value;
        }

        node.presentation = await _buildJWTDid(_presentation.payload);
        node.ancestor = node.revision;
        node.revision = node.successor;
        node.successor = _getRandomAddress();

        await _updateGraph();

        // send event
        _presentation.jwt = node.presentation;
        emitter.emit("payload:ethr:6226:"+identity.address,_presentation.payload);
        emitter.emit("payload:ethr:6226:"+node.revision,_presentation.payload);
        emitter.emit("did:ethr:6226:"+identity.address,node);
        emitter.emit("did:ethr:6226:"+node.revision,node);
        emitter.emit("presentation:ethr:6226:"+identity.address,_presentation);
        emitter.emit("presentation:ethr:6226:"+node.revision,_presentation);
        emitter.emit("jwt:ethr:6226:"+identity.address,node.presentation);
        emitter.emit("jwt:ethr:6226:"+node.revision,node.presentation);
        const _revision = '' + node.ancestor;
        if(typeof _cbRcvdACK == 'function') {
            gun.get(_revision).get('ack').on(function(ack) {
                gun.get(_revision).get('ack').map(async function(_node,from) {
                  if(typeof _subs[_node.revision+':'+from] == 'undefined') {
                    _subs[_node.revision+':'+from] = new Date().getTime();
                    let did = await _resolveDid(_node.did);
                    if(did.issuer == 'did:ethr:6226:'+from) {
                      _subs[_node.revision+':'+from] = await _cbRcvdACK(from,did,did.payload._reference);
                    }
                  }
                });
            });
            setTimeout(function() {
              gun.get(_revision).get('ack').off();
            },_WAITACK);
        }
        return node;
    }

    const retrieveDID = async function(address,_revision) {
      const _node = await _retrievePresentationJWT(address,_revision);
      if((typeof _node !== 'undefined') &&(typeof _node.presentation !== 'undefined')) {
        const _presentation = await _resolveDid(_node.presentation);
        if(_presentation.issuer == 'did:ethr:6226:'+address) {
          return _presentation;
        } else {
          return null;
        }
      } else {
        return null;
      }
    }

    const retrieveRevisions = async function(address,_wait,_noresolve) {
      if((typeof _wait == 'undefined')||(_wait == null)) _wait = _WAITACK;
      let history = [];
      let startTime = new Date().getTime();
      let _revision = null;

      const _innerRetrieve = async function(obj) {
          if(typeof obj.presentation !== 'undefined') {
            history.push(obj);
          } else {
            for (const [key, value] of Object.entries(obj)) {
              if(key.length == 42) {
                  await _innerRetrieve(value);
              }
            }
          }
      }
      const latest = await _inGraphLoad(address);
      for (const [key, value] of Object.entries(latest)) {
          if(key.length == 42) {
              await _innerRetrieve(value);
          }
      }
      for(let i=0;i<history.length;i++) {
        if((typeof history[i] !== 'undefined')&&(typeof history[i].presentation !== 'undefined')) {
          if((typeof _noresolve == 'undefined' )||(_noresolve == null)) {
            history[i].did = await _resolveDid(history[i].presentation);
          } else {
            history[i].did = jsontokens.decodeToken(history[i].presentation);
          }
        }
      }
      return history;
    }

    /**
     * Retrieve a presentation via P2P communitcation by given address and subscribes to changes.
     * @function async retrievePresentation
     * @params {address} Address of presentation to retrieve
    */
    const retrievePresentation = async function(address,_revision,nowait) {
      if((typeof address == 'undefined') || (address == null)) address = identity.address;
      // Do subscribtions - might trigger several times in case of fire? - so we store
      let hash = address + '_' + _revision;
      if(typeof _subs[hash] == 'undefined') {
        const fireEvent = async function(_node) {
          if((typeof _node.revision !== 'undefined') && (typeof _subs[_node.revision] == 'undefined')) {
            _subs[_node.revision] = new Date().getTime();
            const _p = await _resolveDid(_node.presentation);
            if((_p.payload.iat > _subs[hash]) && (_p.issuer == 'did:ethr:6226:'+address)) {
              _subs[hash] = _p.payload.iat;
              _p.jwt = _node.presentation;
              emitter.emit("payload:ethr:6226:"+address,_p.payload);
              emitter.emit("payload:ethr:6226:"+_revision,_p.payload);
              emitter.emit("did:ethr:6226:"+address,_node);
              emitter.emit("did:ethr:6226:"+_revision,_node);
              emitter.emit("presentation:ethr:6226:"+address,_p);
              emitter.emit("presentation:ethr:6226:"+_revision,_p);
              emitter.emit("jwt:ethr:6226:"+address,_node.presentation);
              emitter.emit("jwt:ethr:6226:"+_revision,_node.presentation);
              if(address !== identity.address) {
                let _did = {iat:identity.address};
                if(typeof _cbACK == 'function') {
                  _did = await _cbACK(_p);
                }
                if(typeof _did !== 'undefined') {
                  _did._reference = _p.payload._revision;
                  const ack = await _buildJWTDid(_did); // here we might add a Reply Callback!
                  gun.get(_p.payload._revision).get('ack').get(identity.address).put({did:ack});
                }
              }
            }
          }
        }
        _subs[hash] = Math.round(new Date().getTime()/1000);
        gun.get(address).on(function(_node) {
            fireEvent(_node);
        });
        gun.get(address).get(_revision).on(function(_node) {
            fireEvent(_node);
        });
      }
      const _presentation = await retrieveDID(address,_revision);
      if((typeof _presentation !== 'undefined') && (_presentation !== null) && (typeof _presentation.payload !== 'undefined')) {
        return _presentation.payload;
      } else {
        if((typeof nowait == 'undefined') || (nowait == null) || (nowait==false)) {
          if(lwait < 5000) {
            await sleep(lwait);
            lwait += 500;
            return await retrievePresentation(address,_revision);
          } else {
            lwait = 10;
            return null;
          }
        } else {
          return null;
        }
      }
    }

    const delegate = async function(to,duration) {
      if((typeof duration == 'undefined')||(duration==null)) duration = 3600;

      const provider = new ethers.providers.JsonRpcProvider(config.rpcUrl);
      const wallet = new ethers.Wallet(privateKey,provider);

      const registry = new ethers.Contract( config.registry , config.abi , wallet );
      return await registry.addDelegate(identity.address,"0x766572694b657900000000000000000000000000000000000000000000000000",to,duration);
    }

    const revoke = async function(to) {
      const provider = new ethers.providers.JsonRpcProvider(config.rpcUrl);
      const wallet = new ethers.Wallet(privateKey,provider);
      const registry = new ethers.Contract( config.registry , config.abi , wallet );
      return await registry.revokeDelegate(identity.address,"0x766572694b657900000000000000000000000000000000000000000000000000",to);
    }

    const setIDRole = async function(to,role) {
      const provider = new ethers.providers.JsonRpcProvider(config.rpcUrl);
      const wallet = new ethers.Wallet(privateKey,provider);
      const registry = new ethers.Contract( config.idregistry , config.idabi , wallet );
      return await registry.assign(to,role);
    }

    const getIDRole = async function(from,to,role) {
      const provider = new ethers.providers.JsonRpcProvider(config.rpcUrl);
      const wallet = new ethers.Wallet(privateKey,provider);
      const registry = new ethers.Contract( config.idregistry , config.idabi , wallet );
      return await registry.getRole(from,to);
    }

    const onReceivedACK = function(fct) {
      _cbRcvdACK = fct;
    }

    const onACK = function(fct) {
      _cbACK = fct;
    }

   const setIdentifier = function(address) {
     identity.address = address;
   }

    retrievePresentation();

    if(doReset) {
      await updatePresentation({});
    }

    return {
      wallet: wallet,
      identity: identity,
      gun:gun,
      emitter:emitter,
      stats:stats,
      updatePresentation:updatePresentation,
      retrievePresentation:retrievePresentation,
      retrieveRevisions:retrieveRevisions,
      retrieveDID:retrieveDID,
      delegate:delegate,
      revoke:revoke,
      resolveDID:_resolveDid,
      buildJWT:_buildJWTDid,
      version:VERSION,
      onReceivedACK:onReceivedACK,
      onACK:onACK,
      setIdentifier:setIdentifier,
      node:node,
      setIDRole:setIDRole,
      getIDRole:getIDRole
    }
  }
}

module.exports=TydidsP2P
