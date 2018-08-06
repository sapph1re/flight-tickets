const PrivateKeyProvider = require("truffle-privatekey-provider");
const privateKey = "5B672042AF34CF75C490CD1582D5538F60460E242D4230414368C6202DB15AC9";
const provider =  new PrivateKeyProvider(privateKey, "https://rinkeby.infura.io/yldrXSAA7dkvKUHIvcZP");


module.exports = {
  // See <http://truffleframework.com/docs/advanced/configuration>
  // to customize your Truffle configuration!
  networks: {
    development: {
      host: "127.0.0.1",
      port: "8545",
      network_id: "*"
    },
    rinkeby: {
      provider: provider,
      network_id: 4
    }
  }
};
