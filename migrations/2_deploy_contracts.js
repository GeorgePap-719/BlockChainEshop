const eShop = artifacts.require("eShop.sol");
// const BlindAuction = artifacts.require("BlindAuction")

// Here we clarify the order which the contracts will be deployed.
module.exports = function (deployer) {
    deployer.deploy(eShop);
    //deployer.deploy(BlindAuction);
};
