const eShop = artifacts.require('./eShop.sol')

require('chai')
    .use(require('chai-as-promised'))
    .should()

/*
 * Basic testing using the chai framework,
 * to ensure the contract has been deployed
 * successfully.
 */
contract('eShop', ([deployer, seller, buyer]) => {
    let eshop

    before(async () => {
        eshop = await eShop.deployed()
    })

    describe('deployment', async () => {
        it('deploys successfully', async () => {
            const address = await eshop.address
            assert.notEqual(address, 0x0)
            assert.notEqual(address, '')
            assert.notEqual(address, null)
            assert.notEqual(address, undefined)
        })

        it('has a name', async () => {
            const name = await eshop.name()
            assert.equal(name, 'Dapp eShop')
        })
    })

    describe('products', async () => {
        let result, productCount,bidTime

        before(async () => {
            result = await eshop.createProduct('iPhone X', web3.utils.toWei('1', 'Ether'), {from: seller})

            productCount = await eshop.productCount()
        })

        it('creates products', async () => {
            //Success
            assert.equal(productCount, 1)
            const event = result.logs[0].args
            assert.equal(event.id.toNumber(), productCount.toNumber(), 'id is correct')
            assert.equal(event.name, 'iPhone X', 'name is correct')
            assert.equal(event.price, '1000000000000000000', 'price is correct')
            assert.equal(event.owner, seller, 'owner is correct')
            assert.equal(event.purchased, false, 'purchased is correct')

            //Failure : Product must have a name
            await eshop.createProduct('', web3.utils.toWei('1', 'Ether'), {from: seller}).should.be.rejected;
            //Failure : Product must have a price
            await eshop.createProduct('iPhone X', web3.utils.toWei('0', 'Ether'), {from: seller}).should.be.rejected;
        })

        it('updatesBidding', async () => {
            bidTime = await eshop.updateBiddingEnd('1', '50')
        })

        it('lists products', async () => {
            const product = await eshop.products(productCount)
            assert.equal(product.id.toNumber(), productCount.toNumber(), 'id is correct')
            assert.equal(product.name, 'iPhone X', 'name is correct')
            assert.equal(product.price, '1000000000000000000', 'price is correct')
            assert.equal(product.owner, seller, 'owner is correct')
            assert.equal(product.purchased, false, 'purchased is correct')
        })

        it('sells products', async () => {
            //Track the seller balance before purchase
            oldSellerBalance = await web3.eth.getBalance(seller)
            oldSellerBalance = new web3.utils.BN(oldSellerBalance)

            //Success: Buyer makes purchase
            result = await eshop.purchaseProduct(productCount, {from: buyer, value: web3.utils.toWei('1', 'Ether')})

            //Check logs
            const event = result.logs[0].args
            assert.equal(event.id.toNumber(), productCount.toNumber(), 'id is correct')
            assert.equal(event.name, 'iPhone X', 'name is correct')
            assert.equal(event.price, '1000000000000000000', 'price is correct')
            assert.equal(event.owner, buyer, 'owner is correct')
            assert.equal(event.purchased, true, 'purchased is correct')

            //Check that seller received funds
            let newSellerBalance
            newSellerBalance = await web3.eth.getBalance(seller)
            newSellerBalance = new web3.utils.BN(newSellerBalance)

            let price
            price = web3.utils.toWei('1', 'Ether')
            price = new web3.utils.BN(price)

            const expectedBalance = oldSellerBalance.add(price)

            assert.equal(newSellerBalance.toString(), expectedBalance.toString())

            //Failure: Tries to buy a product that does not exist, i,e., product must have valid id
            await eshop.purchaseProduct(99, {from: buyer, value: web3.utils.toWei('1', 'Ether')}).should.be.rejected
            //Failure:Buyer tries to buy without enough ether
            await eshop.purchaseProduct(productCount, {
                from: buyer,
                value: web3.utils.toWei('0.5', 'Ether')
            }).should.be.rejected
            //Failure: Tries to buy a product , i.e., product cant be purchased twice
            await eshop.purchaseProduct(productCount, {
                from: deployer,
                value: web3.utils.toWei('1', 'Ether')
            }).should.be.rejected
            //Failure: Buyer tries to buy again i.e., buyer cant be the seller
            await eshop.purchaseProduct(productCount, {
                from: buyer,
                value: web3.utils.toWei('1', 'Ether')
            }).should.be.rejected
        })
    })
})
