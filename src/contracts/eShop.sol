pragma solidity ^0.5.0;

contract eShop {
  string public name;
  uint public productCount = 0;
  mapping(uint => Product) public products;

  struct Product {
    uint id;
    string name;
    uint price;
    address owner;
    bool purchased;
  }

event ProductCreated(
  uint id,
  string name,
  uint price,
  address owner,
  bool purchased
);

  constructor() public {
    name = "Dapp eShop";
  }

  function createProduct(string memory _name, uint _price) public {
    //Require a names
    require(bytes(_name).length > 0);
    //Require a vaild price
    require(_price > 0);
    //increament product productCount
    productCount ++;
    //create the product
    products[productCount] = Product(productCount, _name, _price, msg.sender, false);
    //tirgger an event
    emit ProductCreated(productCount, _name, _price, msg.sender, false);
  }
}
// TODO eshop
