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
  ssi:async function(privateKey,config,swarm) {
    if((typeof privateKey == 'undefined') || (privateKey == null)) {
      const wallet = new ethers.Wallet.createRandom();
      privateKey = wallet.privateKey;
    }
    const EthrDID = require("ethr-did").EthrDID;
    const getResolver = require('ethr-did-resolver').getResolver;
    const Resolver = require('did-resolver').Resolver;

    const signalhub = require('signalhub');

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
    const default_config = require("./tydids.config.json");
    if(typeof config !== 'object') {
      config = {};
    }
    if(typeof config.rpcUrl == 'undefined') config.rpcUrl = default_config.rpcUrl;
    if(typeof config.chainName == 'undefined') config.chainName = default_config.chainName;
    if(typeof config.chainId == 'undefined') config.chainId = default_config.chainId;
    if(typeof config.registry == 'undefined') config.registry = default_config.registry;
    if(typeof config.idregistry == 'undefined') config.idregistry = default_config.idregistry;
    if(typeof config.signalDispatcher == 'undefined') config.signalDispatcher = default_config.signalDispatcher;
    if(typeof config.signalKingdom == 'undefined') config.signalKingdom = default_config.signalKingdom;
    if(typeof config.abi == 'undefined') config.abi = require("./EthereumDIDRegistry.abi.json");
    if(typeof config.idabi == 'undefined') config.idabi = require("./EthereumIDRoleRegistry.abi.json");

    class Events extends EventEmitter {
      constructor(config) {
         super();
      }
    }

    const _getRandomAddress = function() {
      const wallet = ethers.Wallet.createRandom();
      return wallet.address;
    }

    const provider = new ethers.providers.JsonRpcProvider(config.rpcUrl);
    const wallet = new ethers.Wallet(privateKey,provider);
    const singingKey = new ethers.utils.SigningKey(privateKey);

    if((typeof config.httpport !== 'undefined') && ( config.httpport !== null)) {
      const path = require('path');
      const server = require('http').createServer(function(req,res) {
        res.writeHead(200, {'Content-Type': 'text/json'});
        const address = path.basename(req.url);
        const dirname = path.dirname(req.url);
        if(dirname == '/did') {
          retrieveDID(address).then(function(data) {
            res.writeHead(200, {'Content-Type': 'text/json'});
            res.write(JSON.stringify(data))
            res.end();
          });
        } else
        if((dirname == '/presentation')||(dirname == '/payload')) {
          retrievePresentation(address).then(function(data) {
            res.writeHead(200, {'Content-Type': 'text/json'});
            res.write(JSON.stringify(data))
            res.end();
          });
        } else
        if(dirname == '/jwt') {
          retrieveDID(address).then(function(data) {
            res.writeHead(200, {'Content-Type': 'text/plain'});
            if(data !== null) {
              res.write(JSON.stringify(data.jwt))
            }
            res.end();
          });
        } else {
          res.writeHead(404, {'Content-Type': 'text/plain'});
          res.end();
        }
      }).listen(config.httpport);
    }

    let hub = signalhub(config.signalKingdom, config.signalDispatcher);

    if((typeof swarm == 'undefined') || (swarm == null)) {
        const webrtcswarm = require('webrtc-swarm');
        swarm = webrtcswarm(hub, {
          wrtc: require('wrtc'),
          uuid:wallet.address
        })
    }

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

    node.identity = identity;

    swarm.on('peer', function (peer, id) {
      try {
      //  peer.send(JSON.stringify(identity)); Removed for better performance
        emitter.emit("mesh",swarm.peers.length);
        emitter.emit("p2p-connect",id);
        peer.on('data', data => {

            data = data.toString();
            // If requested handle
            if(data == 'present') {
             _updateGraph();
            }
            //console.log("Handle Control Message",id,data);
        });
      } catch(e) {}
    })

    swarm.on('disconnect', function (peer, id) {
        emitter.emit("mesh",swarm.peers.length);
        emitter.emit("p2p-disconnect",id);
    })
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
    let lastGraphUpdate = 0;

    const _updateGraph = async function() {
      if(lastGraphUpdate<new Date().getTime()-20000) {
        lastGraphUpdate = new Date().getTime()
        hub.broadcast(identity.address,node);
      }
    }

    const _inGraphRetrieveOnce = async function(address,_revision,_wait) {
      return new Promise(async function(resolve, reject) {
      //  hub.broadcast(address,{present:identity.address});
        hub.subscribe(address)
          .on('data', function (message) {
            resolve(message);
          })
      });
    }
    const _inGraphLoad = async function(address,rn) {
      return new Promise(async function(resolve, reject) {
            reject("Not Implemented");
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

         _updateGraph();

        await sleep(200);
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
            hub.subscribe(_revision)
            .on('data', async function (message) {
              let from = '';
              if(typeof _subs[_node.revision+':'+from] == 'undefined') {
                _subs[_node.revision+':'+from] = new Date().getTime();
                let did = await _resolveDid(_node.did);
                if(did.issuer == 'did:ethr:6226:'+from) {
                  _subs[_node.revision+':'+from] = await _cbRcvdACK(from,did,did.payload._reference);
                }
              }
            })
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
          return {err:'Different Issuer'};
        }
      } else {
        await sleep(100);
        return await retrieveDID(address,_revision);
      }
    }

    const retrieveRevisions = async function(address,_wait,_noresolve) {
      throw new Error("Not implemented");
      return [];
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
                  const ack = await _buildJWTDid(_did); // here we might add a Reply Callback!
                  // hub.broadcast(_revision,ack);
                }
              }
            }
          }
        }
        _subs[hash] = Math.round(new Date().getTime()/1000);
        hub.subscribe(address)
          .on('data', function (_node) {
            fireEvent(_node);
          })
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

    //retrievePresentation();

    await updatePresentation({});

    let subscribers =0;

    hub.subscribe(identity.address)
      .on('data', function (_req) {
        if(typeof _req.present !== 'undefined') {
            _updateGraph();
        }
    });

    return {
      wallet: wallet,
      identity: identity,
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
      getIDRole:getIDRole,
      subscribers:hub.subscribers.length,
      swarm:swarm.peers.length
    }
  }
}

module.exports=TydidsP2P
