const BlindAuction = artifacts.require('./BlindAuction.sol')

require('chai')
    .use(require('chai-as-promised'))
    .should()

/*
 * Basic testing using the chai framework,
 * to ensure the contract has been deployed
 * successfully.
 */
contract('BlindAuction', ([deployer, seller, buyer]) => {
    let blindAuction

    before(async () => {
        blindAuction = await BlindAuction.deployed()
    })

    describe('deployment', async () => {
        it('deploys successfully', async () => {
            const address = await blindAuction.address
            assert.notEqual(address, 0x0)
            assert.notEqual(address, '')
            assert.notEqual(address, null)
            assert.notEqual(address, undefined)
        })

        it('has a name', async () => {
            const name = await blindAuction.name()
            assert.equal(name, 'BlindAuction')
        })

    })


})