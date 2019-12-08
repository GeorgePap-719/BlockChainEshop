const eShop = artifacts.require("./eShop.sol");

module.exports = function(deployer) {
    deployer.deploy(eShop);
};
