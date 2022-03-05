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
  encryptWithPublicKey:_encryptWithPublicKey,
  decryptWithPrivateKey:_decryptWithPrivateKey,
  ssi:async function(privateKey,doReset,gun) {
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


    const node = {
      presentation:null,
      revision:null,
      successor:null,
      ancestor:null,
      identity:null
    }
    const config = {
      rpcUrl: "https://rpc.tydids.com/",
      name: "mainnet",
      chainId: "6226",
      registry:"0xaC2DDf7488C1C2Dd1f8FFE36e207D8Fb96cF2fFB",
      abi:require("./EthereumDIDRegistry.abi.json"),
      gunPeers:['https://webrtc.tydids.com/gun'],
      relays:['https://relay.tydids.com/tydids/']
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

    const keys = {
      address:wallet.address,
      privateKey:privateKey,
      publicKey:EthCrypto.publicKeyByPrivateKey(privateKey),
    }

    const identity = {
      address:keys.address,
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
    const _resolveDid = async function(jwt) {
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
        console.log('_resolveDid - Master Caution',e);
        let res = jsontokens.decodeToken(jwt)
        return res;
      }
    }

    const _buildJWTDid = async function(object,_identity) {
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
      await retrievePresentation(identity.address);
      await retrievePresentation(identity.address,node.revision);
      for(let i=0;i<config.relays.length;i++) {
        try {
          https.get(config.relays[i]+'/retrievePresentation?address='+identity.address+'&revision='+node.revision,function(res) {});
          await sleep(100);
          https.get(config.relays[i]+'/retrievePresentation?address='+identity.address,function(res) {});
        } catch(e) {

        }
      }

    }

    const _inGraphRetrieveOnce = async function(address,_revision) {
      return new Promise(async function(resolve, reject) {
          if((typeof _revision == 'undefined') || (_revision == null)) {
            gun.get(address).once(function(_node) {
              resolve(_node);
            });
          } else {
            gun.get(address).get(_revision).once(function(_node) {
                resolve(_node);
            });
          }
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
            /*
            while((typeof inGraph == 'undefined')||(inGraph == null)) {
              await sleep(2000);
              inGraph = await _inGraphRetrieveOnce(address,_revision);
            }
            */
            resolve(inGraph)
      });
    }

    // Public functions
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
        return node;
    }

    const retrieveDID = async function(address,_revision) {
      const _node = await _retrievePresentationJWT(address,_revision);
      if((typeof _node !== 'undefined') &&(typeof _node.presentation !== 'undefined')) {
        const _presentation = await _resolveDid(_node.presentation);
        return _presentation;
      } else {
        return null;
      }
    }

    const retrievePresentation = async function(address,_revision,nowait) {
      if((typeof address == 'undefined') || (address == null)) address = identity.address;
      // Do subscribtions - might trigger several times in case of fire? - so we store
      let hash = address + '_' + _revision;
      if(typeof _subs[hash] == 'undefined') {
        const fireEvent = async function(_node) {
          const _p = await _resolveDid(_node.presentation);
          if(_p.payload.iat > _subs[hash]) {
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
          await sleep(lwait);
          lwait += 500;
          return await retrievePresentation(address,_revision);
        } else {
          return null;
        }
      }
    }

    const delegate = async function(address) {

    }

    const revoke = async function(address) {

    }

    retrievePresentation();

    return {
      wallet: wallet,
      identity: identity,
      gun:gun,
      emitter:emitter,
      stats:stats,
      updatePresentation:updatePresentation,
      retrievePresentation:retrievePresentation,
      retrieveDID:retrieveDID,
      delegate:delegate,
      revoke:revoke,
      resolveDID:_resolveDid,
      buildJWT:_buildJWTDid,
      version:VERSION
    }
  }
}

module.exports=TydidsP2P
