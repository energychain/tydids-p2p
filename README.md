# tydids-p2p

<a href="https://stromdao.de/" target="_blank" title="STROMDAO - Digital Energy Infrastructure"><img src="./static/stromdao.png" align="right" height="85px" hspace="30px" vspace="30px"></a>

**A consensus driven decentralized data governance framework.**

[![npm](https://img.shields.io/npm/dt/tydids-p2p.svg)](https://www.npmjs.com/package/tydids-p2p)
[![npm](https://img.shields.io/npm/v/tydids-p2p.svg)](https://www.npmjs.com/package/tydids-p2p)
[![CO2Offset](https://api.corrently.io/v2.0/ghgmanage/statusimg?host=tydids-p2p&svg=1)](https://co2offset.io/badge.html?host=tydids-p2p)

[![Open in Gitpod](https://gitpod.io/button/open-in-gitpod.svg)](https://gitpod.io/#https://github.com/energychain/tydids-p2p)

## Installation

### Use on CLI

```shell
npm i -g tydids-p2p

tydids -h
```

### Use as Module

```shell
npm i -s tydids-p2p
```

#### Node
```javascript
const tydids = require("tydids-p2p");

// Get a new privateKey (Step 0)
const wallet = tydids.ethers.Wallet.createRandom();
const privateKey = wallet.privateKey;  // save this key! if not - you will get a new random one each time!

// Initialisation and get SSI Object
const ssi = await tydids.ssi(privateKey);

```

## API / Usage

### Create Private Key (SSI)
Each self sovereign identity needs to have a private-key. So any usage/function starts with requires it.

#### Shell / CLI
```shell
tydids --createPrivateKey
0x62c3e5c1906d6e19e35e6fc1575dde0bc9bc5bc0c1ea84caf84b371a4bc00dca

tydids --
priv 0x62c3e5c1906d6e19e35e6fc1575dde0bc9bc5bc0c1ea84caf84b371a4bc00dca --identity -x
```

#### Node
```javascript
const wallet = tydids.ethers.Wallet.createRandom();
const privateKey = wallet.privateKey;
const ssi = await tydids.ssi(privateKey);
console.log(ssi.identity);
```

**Note: For better readability private-key  (eq. init of SSI) is implicit on the other examples. So in console/shell always add `--priv` argument. In your code do `const ssi = await tydids.ssi(privateKey);`.**

### Retrieve a public presentation

#### Shell / CLI
```shell
tydids --presentation 0x8b77634AE6D170C34657880fF1eAC9Aaf566Fd1E -x

{
  iat: 1644793815,
  id: 'did:ethr:6226:0x8b77634AE6D170C34657880fF1eAC9Aaf566Fd1E',
  address: '0x8b77634AE6D170C34657880fF1eAC9Aaf566Fd1E',
  publicKey: 'be2ad6f7a6ca94cf1682d8c5ac8a98cfc208c62da6289fd2a9ea68841f69a39e945aab35a0752c24a252bdab81b742669e21daae04a228d5ab2941beda8bcf91',
  creator: '0xB123089d1d094E128caec0DeD1A95A12159BA48D',
  iss: 'did:ethr:6226:0x8b77634AE6D170C34657880fF1eAC9Aaf566Fd1E',
  hello: 'world',
  ...
}
```

**Note: parameter `-x` allows to quit/exit directly after receiving the did. Not listening to updates.**

#### Node
```javascript
let presentation = await ssi.retrieveVP(address);
console.log(presentation);
```

### Create a new presentation
Will be owned by SSI and will have a unique ID (address).

#### Shell / CLI
```shell
tydids --createPresentation -x
```

```javascript
{
  id: 'did:ethr:6226:0xb80A4B2E0CC4d51cC6365eB5B12523730fC7bb04',
  address: '0xb80A4B2E0CC4d51cC6365eB5B12523730fC7bb04',
  publicKey: '71085032d5cd1b5ce70cc535d4a30f6ef60628388fa38d08df335c7e2b6ed0517b248ded789da07a0b1e01d15e0003000b7150876bc2efb0aa9cd7acb6b7f492',
  creator: '0x5Cb08Dec0595671E2C1f45Da3BbBF6f75ED3F4C7'
}
```

#### Node
```javascript
let presentation = await ssi.createManagedPresentation();
console.log(presentation);
```

### Set field/attribute of presentation with value
In order to change a value SSI needs to be either owner or delegate.

#### Shell / CLI
```shell
tydids -x -p 0xb80A4B2E0CC4d51cC6365eB5B12523730fC7bb04 -s key1 value1

tydids -x -p 0xb80A4B2E0CC4d51cC6365eB5B12523730fC7bb04
```

```javascript
{
  iat: 1644885295,
  id: 'did:ethr:6226:0xb80A4B2E0CC4d51cC6365eB5B12523730fC7bb04',
  address: '0xb80A4B2E0CC4d51cC6365eB5B12523730fC7bb04',
  publicKey: '71085032d5cd1b5ce70cc535d4a30f6ef60628388fa38d08df335c7e2b6ed0517b248ded789da07a0b1e01d15e0003000b7150876bc2efb0aa9cd7acb6b7f492',
  creator: '0x5Cb08Dec0595671E2C1f45Da3BbBF6f75ED3F4C7',
  iss: 'did:ethr:6226:0xb80A4B2E0CC4d51cC6365eB5B12523730fC7bb04',
  key1: 'value1'
}
```

#### Node
```javascript
let presentation = await ssi.retrieveVP(address);
presentation[key] = value;
await ssi.updateVP(address,presentation);
```

## Maintainer / Imprint

<addr>
STROMDAO GmbH  <br/>
Gerhard Weiser Ring 29  <br/>
69256 Mauer  <br/>
Germany  <br/>
  <br/>
+49 6226 968 009 0  <br/>
  <br/>
kontakt@stromdao.com  <br/>
  <br/>
Handelsregister: HRB 728691 (Amtsgericht Mannheim)
</addr>

Project Website: https://tydids.com/

## LICENSE
[Apache-2.0](./LICENSE)
