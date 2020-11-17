// SPDX-License-Identifier: GL2PS License

pragma solidity 0.7.4;

//import "./BlindAuction.sol";

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

    //BlindAuction
    address payable public beneficiary;//seller
    uint public biddingEnd;
    uint public revealEnd;
    bool public ended;
    // uint public productWithBidsCount = 0;
    mapping(uint => ProductWithBids) public internalProducts;

    mapping(address => Bid[]) public bids;

    address public highestBidder;
    uint public highestBid;

    // Allowed withdrawals of previous bids
    mapping(address => uint) pendingReturns;

    enum State {Created, Locked, Release, Inactive}
    // The state variable has a default value of the first member(Created)
    State public state;

    modifier onlyBefore(uint _time) {require(block.timestamp < _time);
        _;}
    modifier onlyAfter(uint _time) {require(block.timestamp > _time);
        _;}
    //modified modifiers TODO
    //    modifier onlyBefore(uint _time) {require(block.timestamp < _time);
    //        _;}
    //    modifier onlyAfter(uint _time) {require(block.timestamp > _time);
    //        _;}

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

    struct Bid {
        bytes32 blindedBid;
        uint deposit;
    }

    struct Product {
        uint id;
        string name;
        uint price;
        address payable owner;
        bool purchased;
        State state;
        uint biddingTime;
        uint revealTime;
    }

    struct ProductWithBids {
        uint id;
        string name;
        uint price;
        address payable owner;
        address payable beneficiary;
        bool purchased;
        State state;
        mapping(address => Bid[]) bids;
        uint biddingEnd;
        uint revealEnd;
        bool ended;
        bool biddingTime;
        bool revealTime;
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

    event AuctionEnded(address winner, uint highestBid);
    event NewAuctionBegins();

    // Ensure that `msg.value` is an even number.
    // Division will truncate if it is an odd number.
    // Check via multiplication that it wasn't an odd number
    constructor() payable {
        name = "Dapp eShop";
        seller = msg.sender;
        beneficiary = msg.sender;
        value = msg.value / 2;
        require((2 * value) == msg.value, "Value has to be even.");
    }

    //BlindAuction Contract
    function newAuction(
        uint _biddingTime,
        uint _revealTime
    //        address payable _beneficiary
    )
    public
    {
        emit NewAuctionBegins();
        //        beneficiary = _beneficiary;
        biddingEnd = block.timestamp + _biddingTime;
        revealEnd = biddingEnd + _revealTime;
    }

    /// Place a blinded bid with `_blindedBid` =
    /// keccak256(abi.encodePacked(value, fake, secret)).
    /// The sent ether is only refunded if the bid is correctly
    /// revealed in the revealing phase. The bid is valid if the
    /// ether sent together with the bid is at least "value" and
    /// "fake" is not true. Setting "fake" to true and sending
    /// not the exact amount are ways to hide the real bid but
    /// still make the required deposit. The same address can
    /// place multiple bids.
    function bid(bytes32 _blindedBid)
    public
    payable
    onlyBefore(biddingEnd)
    {
        bids[msg.sender].push(Bid({
            blindedBid : _blindedBid,
            deposit : msg.value
            }));
    }

    /// Reveal your blinded bids. You will get a refund for all
    /// correctly blinded invalid bids and for all bids except for
    /// the totally highest.
    function reveal(
        uint[] memory _values,
        bool[] memory _fake,
        bytes32[] memory _secret
    )
    public
    onlyAfter(biddingEnd)
    onlyBefore(revealEnd)
    {
        uint length = bids[msg.sender].length;
        require(_values.length == length);
        require(_fake.length == length);
        require(_secret.length == length);

        uint refund;
        for (uint i = 0; i < length; i++) {
            Bid storage bidToCheck = bids[msg.sender][i];
            (uint value, bool fake, bytes32 secret) =
            (_values[i], _fake[i], _secret[i]);
            if (bidToCheck.blindedBid != keccak256(abi.encodePacked(value, fake, secret))) {
                // Bid was not actually revealed.
                // Do not refund deposit.
                continue;
            }
            refund += bidToCheck.deposit;
            if (!fake && bidToCheck.deposit >= value) {
                if (placeBid(msg.sender, value))
                    refund -= value;
            }
            // Make it impossible for the sender to re-claim
            // the same deposit.
            bidToCheck.blindedBid = bytes32(0);
        }
        msg.sender.transfer(refund);
    }

    /// Withdraw a bid that was overbid.
    //This cant be called by js?
    function withdraw() public {
        uint amount = pendingReturns[msg.sender];
        if (amount > 0) {
            // It is important to set this to zero because the recipient
            // can call this function again as part of the receiving call
            // before `transfer` returns (see the remark above about
            // conditions -> effects -> interaction).
            pendingReturns[msg.sender] = 0;

            msg.sender.transfer(amount);
        }
    }

    /// End the auction and send the highest bid
    /// to the beneficiary.
    // Maybe only the seller can call this?
    // TODO
    //Or let the js call this
    function auctionEnd()
    public
    onlyAfter(revealEnd)
    {
        require(!ended);
        emit AuctionEnded(highestBidder, highestBid);
        ended = true;
        beneficiary.transfer(highestBid);
    }

    // This is an "internal" function which means that it
    // can only be called from the contract itself (or from
    // derived contracts).
    function placeBid(address bidder, uint value) internal
    returns (bool success)
    {
        if (value <= highestBid) {
            return false;
        }
        if (highestBidder != address(0)) {
            // Refund the previously highest bidder.
            pendingReturns[highestBidder] += highestBid;
        }
        highestBid = value;
        highestBidder = bidder;
        return true;
    }

    //End of BlindAuction

    /// Abort the purchase and reclaim the ether.
    /// Can only be called by the seller before
    /// the contract is locked.
//    function abort()
//    public
//    onlySeller
//    inState(State.Created)
//    {
//        emit Aborted();
//        state = State.Inactive;
//        // We use transfer here directly. It is
//        // repentantly-safe, because it is the
//        // last call in this function and we
//        // already changed the state.
//        seller.transfer(address(this).balance);
//    }

//    //Internal function so we can set the auction for the new
//    //Item
//    //TODO unused argument
//    function newAuctionInit(address payable _beneficiary) internal {
//        //        uint _biddingTime = 60;
//        //        uint _revealTime = 15;
//        //        //Call the BlindAuction contract method TODO
//        //        // newAuction(_biddingTime, _revealTime, _beneficiary)
//        //        BlindAuction blindAuction = new BlindAuction();
//        //        blindAuction.newAuction(
//        //            _biddingTime,
//        //            _revealTime
//        //        //            _beneficiary
//        //        );
//
//    }

//    /// Confirm the purchase as buyer.
//    /// Transaction has to include `2 * value` ether.
//    /// The ether will be locked until confirmReceived
//    /// is called.
//    //Note: i will change this , to be able to be called
//    //by both parties , so the buyer can have some avtual
//    //time to change his time and abort the transaction
//    function confirmPurchase(uint _id)
//    public
//    inState(State.Created)
//    condition(msg.value == (2 * value))
//    payable
//    {
//        emit PurchaseConfirmed();
//        buyer = msg.sender;
//        state = State.Locked;
//    }

//    /// Confirm that you (the buyer) received the item.
//    /// This will release the locked ether.
//    function confirmReceived()
//    public
//    onlyBuyer
//    inState(State.Locked)
//    {
//        emit ItemReceived();
//        // It is important to change the state first because
//        // otherwise, the contracts called using `send` below
//        // can call in again here.
//        state = State.Release;
//
//        buyer.transfer(value);
//    }

//    /// This function refunds the seller, i.e.
//    /// pays back the locked funds of the seller.
//    function refundSeller()
//    public
//    onlySeller
//    inState(State.Release)
//    {
//        emit SellerRefunded();
//        // It is important to change the state first because
//        // otherwise, the contracts called using `send` below
//        // can call in again here.
//        state = State.Inactive;
//
//        seller.transfer(3 * value);
//    }

    function createProduct(string memory _name, uint _price) public {
        //Require a names
        require(bytes(_name).length > 0);
        //Require a valid price
        require(_price > 0);
        //increase product productCount
        productCount ++;
        //create the product
        //        products[productCount] = Product(
        //            productCount,
        //            _name,
        //            _price,
        //            msg.sender,
        //            false,
        //            State.Created);


        /*
         * Note how in all the functions, a struct type is assigned to
         * a local variable with data location storage. This does not copy
         * the struct but only stores a reference so that assignments
         * to members of the local variable actually write to the state.
        */

        ProductWithBids storage newProduct = internalProducts[productCount];
        //create the product
        newProduct.id = productCount;
        newProduct.name = _name;
        newProduct.price = _price;
        newProduct.owner = msg.sender;
        newProduct.beneficiary = msg.sender;
        newProduct.purchased = false;
        newProduct.state = State.Created;

        //trigger an event
        emit ProductCreated(productCount, _name, _price, msg.sender, false, State.Created);

        //Seller must also pay 2*value of the product he lists. TODO
    }

    function beginAuction(ProductWithBids storage product) internal {
        //
        // We cannot use "campaigns[campaignID] = Campaign(beneficiary, goal, 0, 0)"
        // because the RHS creates a memory-struct "Campaign" that contains a mapping.
        // productWithBidsCount++;
        ProductWithBids storage newProduct = product;

        //init new Auction
        newProduct.biddingEnd =  60; //block.timestamp + 60
        newProduct.revealEnd = newProduct.biddingEnd + 60;

        //TODO modify it so it can support multiple auctions at the same time.
        biddingEnd = newProduct.biddingEnd;
        revealEnd = newProduct.revealEnd;


    }

    function purchaseProduct(uint _id) public payable {
        //Fetch the Product
        ProductWithBids storage _product = internalProducts[_id];
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
        //update the product maybe we dont need it anymore cause of storage type
        //internalProducts[_id] = _product;
        //Pay the seller by sending them Ether
        _seller.transfer(msg.value);
        //trigger an event
        emit ProductPurchased(productCount, _product.name, _product.price, msg.sender, true);

        //..beginAuction
        beginAuction(_product);

    }

    //Public setter
    function updateBiddingEnd(uint _id, uint _biddingEnd) public {
        //Fetch the Product
        ProductWithBids storage product = internalProducts[_id];
        //updateTheBidding
        product.biddingEnd = _biddingEnd;
    }








}

// TODO eshop
