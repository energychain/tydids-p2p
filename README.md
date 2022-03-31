# tydids-p2p

<a href="https://stromdao.de/" target="_blank" title="STROMDAO - Digital Energy Infrastructure"><img src="./static/stromdao.png" align="right" height="85px" hspace="30px" vspace="30px"></a>

**A consensus driven decentralized data governance framework.**

[![npm](https://img.shields.io/npm/dt/tydids-p2p.svg)](https://www.npmjs.com/package/tydids-p2p)
[![npm](https://img.shields.io/npm/v/tydids-p2p.svg)](https://www.npmjs.com/package/tydids-p2p)
[![CircleCI](https://circleci.com/gh/energychain/tydids-p2p/tree/main.svg?style=svg)](https://circleci.com/gh/energychain/tydids-p2p/tree/main)
[![CO2Offset](https://api.corrently.io/v2.0/ghgmanage/statusimg?host=tydids-p2p&svg=1)](https://co2offset.io/badge.html?host=tydids-p2p)
[![Join the chat at https://gitter.im/stromdao/tydids-p2p](https://badges.gitter.im/stromdao/tydids-p2p.svg)](https://gitter.im/stromdao/tydids-p2p?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

[![Open in Gitpod](https://gitpod.io/button/open-in-gitpod.svg)](https://gitpod.io/#https://github.com/energychain/tydids-p2p)
[![CodePen]((https://img.shields.io/badge/Codepen-000000?style=for-the-badge&logo=codepen&logoColor=white))](https://codepen.io/zoernert/pen/wvPmOvw)

Imagine a dataset that is available somewhere in the world might be accessed everywhere. How? You just need to know its address.
- Decide who is allowed to see this dataset.
- Forget about protocols, p2p, request-responds, polling for changes.
- Set a value in your dataset with one line of code
- Subscribe to changes with another single line of code

## This is TyDIDs.

## Installation

### Use on CLI

```shell
npm i -g tydids-p2p

tydids -h
```

### API

```shell
const TyDIDs = require('tydids-p2p');

const wallet = TyDIDs.ethers.Wallet.createRandom();
const privateKey = wallet.privateKey; // save this key! if not - you will get a new random one each time!

const app = async function () {
  // Initialisation and get SSI Object
  const ssi = await TyDIDs.ssi(privateKey, true);

  // Subscribe to a "Hello-World" Data Set regulary updated
  let dataset = await ssi.retrievePresentation(
    '0x19B9f727e38F224dE49b564282c339F1f8e224Ea'
  );
  console.log(dataset);
};

app();

```


## Cookbook Receipts

### Retrieve DID/Presentation via http
TyDIDs has a built in mini http-server providing you access to dids,jwts,presentations

```shell
tydids --http 8989
```

URL Schema:
http://localhost:8989/payload/[address] - Presentation payload (JSON)

http://localhost:8989/did/[address] - Full DID (JSON)

http://localhost:8989/jwt/[address] - JSON-WebToken presentation (full DID)




## [CONTRIBUTING](https://github.com/energychain/tydids-p2p/blob/main/CONTRIBUTING.md)

## [CODE OF CONDUCT](https://github.com/energychain/tydids-p2p/blob/main/CODE_OF_CONDUCT.md)


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
