const eShop = artifacts.require('./eShop.sol')

require('chai')
  .use(require('chai-as-promised'))
  .should()

contract('eShop', ([deployer , seller , buyer]) => {
  let eshop

  before(async () => {
    eshop = await eShop.deployed()
  })

  describe('deployment', async () => {
    it('deploys succesfully', async () => {
      const address = await eshop.address
      assert.notEqual(address, 0x0)
      assert.notEqual(address, '')
      assert.notEqual(address, null)
      assert.notEqual(address, undefined)
    })

    it('has a name', async () => {
      const name = await eshop.name()
      assert.equal(name,'Dapp eShop')
    })
  })

  describe('products', async () => {
    let result,productCount

    before(async () => {
      result = await eshop.createProduct('iPhone X',web3.utils.toWei('1', 'Ether'), { from : seller })
      productCount = await eshop.productCount()
    })

    it('creates products', async () => {
      //Success
      assert.equal(productCount,1)
      const event = result.logs[0].args
      assert.equal(event.id.toNumber(), productCount.toNumber(), 'id is correct')
      assert.equal(event.name, 'iPhone X' , 'name is correct')
      assert.equal(event.price, '1000000000000000000', 'price is correct')
      assert.equal(event.owner, seller, 'owner is correct')
      assert.equal(event.purchased, false, 'purchased is correct')

      //Failure : Product must have a name
      await eshop.createProduct('',web3.utils.toWei('1', 'Ether'), { from : seller }).should.be.rejected;
      //Failure : Product must have a price
      await eshop.createProduct('iPhone X',web3.utils.toWei('0', 'Ether'), { from : seller }).should.be.rejected;
      
    })
  })



})
