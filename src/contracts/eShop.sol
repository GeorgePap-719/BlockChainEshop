pragma solidity ^0.5.0;

contract eShop {
    string public name;
    uint public productCount = 0;
    mapping(uint => Product) public products;
    uint value;//value == price

    //Safely Remote
    address payable public seller;
    address payable public buyer;
    //Check if its preferable to transfer
    //the safety mechanism in another contract TODO

    enum State {Created, Locked, Release, Inactive}
    // The state variable has a default value of the first member(Created)
    State public state;

  modifier condition(bool _condition) {
       require(_condition);
       _;
   }

  modifier onlyBuyer() {
        require(
            msg.sender == buyer,
            "Only buyer can call this."
        );
        _;
    }

  modifier onlySeller() {
        require(
            msg.sender == seller,
            "Only seller can call this."
        );
        _;
    }

  modifier inState(State _state) {
        require(
            state == _state,
            "Invalid state."
        );
        _;
    }


    struct Product {
        uint id;
        string name;
        uint price;
        address payable owner;
        bool purchased;
        State state;
    }

event ProductCreated(
    uint id,
    string name,
    uint price,
    address payable owner,
    bool purchased,
    State state
);

event ProductPurchased(
  uint id,
  string name,
  uint price,
  address payable owner,
  bool purchased
);

    //Events for enforcing the safety
    event Aborted();
    event PurchaseConfirmed();
    event ItemReceived();
    event SellerRefunded();

  // Ensure that `msg.value` is an even number.
  // Division will truncate if it is an odd number.
  // Check via multiplication that it wasn't an odd number
    constructor() public payable {
        name = "Dapp eShop";
        seller = msg.sender;
        value = msg.value / 2;
        require((2 * value) == msg.value, "Value has to be even.");
    }

  /// Abort the purchase and reclaim the ether.
  /// Can only be called by the seller before
 /// the contract is locked.
   function abort()
      public
      onlySeller
      inState(State.Created)
  {
    emit Aborted();
    state = State.Inactive;
    // We use transfer here directly. It is
      // reentrancy-safe, because it is the
      // last call in this function and we
      // already changed the state.
      seller.transfer(address(this).balance);
  }

    /// Confirm the purchase as buyer.
    /// Transaction has to include `2 * value` ether.
    /// The ether will be locked until confirmReceived
    /// is called.
    //Note: i will change this , to be able to be called
    //by both parties , so the buyer can have some avtual
    //time to change his time and abort the transaction
    function confirmPurchase(uint _id)
    public
    inState(State.Created)
    condition(msg.value == (2 * value))
    payable
    {
        emit PurchaseConfirmed();
        buyer = msg.sender;
        state = State.Locked;
    }

   /// Confirm that you (the buyer) received the item.
   /// This will release the locked ether.
   function confirmReceived()
       public
       onlyBuyer
       inState(State.Locked)
   {
       emit ItemReceived();
       // It is important to change the state first because
       // otherwise, the contracts called using `send` below
       // can call in again here.
       state = State.Release;

       buyer.transfer(value);
   }

   /// This function refunds the seller, i.e.
   /// pays back the locked funds of the seller.
   function refundSeller()
       public
       onlySeller
       inState(State.Release)
   {
       emit SellerRefunded();
       // It is important to change the state first because
       // otherwise, the contracts called using `send` below
       // can call in again here.
       state = State.Inactive;

       seller.transfer(3 * value);
   }

  function createProduct(string memory _name, uint _price) public {
      //Require a names
      require(bytes(_name).length > 0);
      //Require a valid price
      require(_price > 0);
      //increase product productCount
      productCount ++;
      //create the product
      products[productCount] = Product(
          productCount,
          _name,
          _price,
          msg.sender,
          false,
          State.Created);
      //trigger an event
      emit ProductCreated(productCount, _name, _price, msg.sender, false, State.Created);


      //Seller must also pay 2*value of the product he lists.

  }

function purchaseProduct(uint _id) public payable {
  //Fetch the Product
  Product memory _product = products[_id];
  //Fetch the owner
  address payable _seller = _product.owner;
  //Make sure the product has valid id
  require(_product.id > 0 && _product.id <= productCount);
  //Require that there is enough Ether in the transaction
  require(msg.value >= _product.price);
  //Require that the product has not been purchased already
  require(!_product.purchased);
  //Require that the buyer is not the _seller
  require(_seller != msg.sender);
  //Transfer ownership to the buyer
  _product.owner = msg.sender;
    //Mark as purchasedProduct
    _product.purchased = true;
    //update the product
    products[_id] = _product;
    //Pay the seller by sending them Ether
    address(_seller).transfer(msg.value);
    //trigger an event
    emit ProductPurchased(productCount, _product.name, _product.price, msg.sender, true);
}

    function purchaseProductPhase1(uint _id) public payable {
        //Function to lock the ether first
        //then we will get to the secondphase which will be
        //either confirm or Abort

    }


}
// TODO eshop
