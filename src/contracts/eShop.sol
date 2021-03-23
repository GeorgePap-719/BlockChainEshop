// SPDX-License-Identifier: GL2PS License
pragma solidity 0.7.4;
pragma experimental ABIEncoderV2;
/*
 * The above statement is mandatory
 * as it enables support for two levels
 * of dynamic arrays .
 */


contract eShop {
    string public name;
    uint public productCount = 0;
    //uint value;//value == price

    //Safely Remote
    address payable public seller;
    address payable public buyer;

    //BlindAuction
    address payable public beneficiary;//seller

    mapping(uint => ProductWithBids) public internalProducts;

    //mapping(address => Bid[]) public bids;
    //mapping(address => SecretBids[]) public nakedBids;
    uint public globalBidsCount = 0;

    // Allowed withdrawals of previous bids
    //mapping(address => uint) pendingReturns;

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

    struct SecretBids {
        uint values;
        bool fake;
        string secret;
    }

    struct ProductWithBids {
        uint id;
        string name;
        uint price;
        address payable owner;
        address payable beneficiary;
        bool purchased;

        mapping(address => Bid[]) bids;
        mapping(address => SecretBids[]) nakedBids;
        // Allowed withdrawals of previous bids
        mapping(address => uint) pendingReturns;

        uint bidsCount;

        bool ended;
        uint biddingEnd;
        uint revealEnd;

        address highestBidder;
        uint highestBid;
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

    event isTrue(bool flag);
    event isFalse(bool flag);
    event deposit(uint value);
    event depositValue(uint value);
    event IWillReturnTrue();
    event DidNotMeetRequireYet();
    event NotRevealedYet(address refunded);
    event AuctionEnded(address winner, uint highestBid);
    event NewAuctionBegins();
    event Revealed(address refunded);

    // Ensure that `msg.value` is an even number.
    // Division will truncate if it is an odd number.
    // Check via multiplication that it wasn't an odd number
    constructor() payable {
        name = "Dapp eShop";
        seller = msg.sender;
        beneficiary = msg.sender;
    }

    function checkBidding(
        uint _id,
        bytes32 _blindedBid,
        uint _values,
        bool _fake,
        string memory _secret
    )
    public
    payable {
        ProductWithBids storage newProduct = internalProducts[_id];
        //onlyBefore
        if (block.timestamp < newProduct.biddingEnd) {
            bid(_blindedBid, _id);
            pushNakedBids(
                _values,
                _fake,
                _secret,
                _id
            );
            newProduct.bidsCount++;
        }
    }

    function setAuctionVars(ProductWithBids storage product) internal {
        // We cannot use "campaigns[campaignID] = Campaign(beneficiary, goal, 0, 0)"
        // because the RHS creates a memory-struct "Campaign" that contains a mapping.
        // productWithBidsCount++;
        ProductWithBids storage newProduct = product;

        newProduct.ended = false;
        newProduct.bidsCount = 0;
        newProduct.biddingEnd = block.timestamp + 40;
        newProduct.revealEnd = newProduct.biddingEnd + 60;
        //        bidsCount = 0;
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
    function bid(bytes32 _blindedBid, uint id)
    public
    payable
        //onlyBefore(biddingEnd) TODO
    {
        ProductWithBids storage newProduct = internalProducts[id];

        newProduct.bids[msg.sender].push(Bid({
        blindedBid : _blindedBid,
        deposit : msg.value
        }));

        globalBidsCount++;
    }

    function pushNakedBids(
        uint _values,
        bool _fake,
        string memory _secret,
        uint id
    )
    public
    payable
    {
        ProductWithBids storage newProduct = internalProducts[id];

        newProduct.nakedBids[msg.sender].push(SecretBids({
        values : _values,
        fake : _fake,
        secret : _secret
        }));
    }

    ///secret is just the required string for the matching encoding
    /// Reveal your blinded bids. You will get a refund for all
    /// correctly blinded invalid bids and for all bids except for
    /// the totally highest.
    function revealInternal(
        uint[] memory _values,
        bool[] memory _fake,
        string[] memory _secret,
        uint _id
    )
    public
    payable
    onlyAfter(biddingEnd)
    onlyBefore(revealEnd)
    {
        ProductWithBids storage newProduct = internalProducts[_id];

        uint length = newProduct.bids[msg.sender].length;
        require(_values.length == length);
        require(_fake.length == length);
        require(_secret.length == length);

        uint refund;
        for (uint i = 0; i < length; i++) {
            Bid storage bidToCheck = newProduct.bids[msg.sender][i];
            (uint value, bool fake, string memory secret) =
            (_values[i], _fake[i], _secret[i]);
            if (bidToCheck.blindedBid != keccak256(abi.encodePacked(value, fake, secret))) {
                // Bid was not actually revealed.
                // Do not refund deposit.
                emit NotRevealedYet(msg.sender);
                continue;
            }
            refund += bidToCheck.deposit;
            //TODO never goes in if, Investigate
            if (fake) {
                emit isTrue(fake);
                //TODO isTrue
            } else {
                emit isFalse(fake);
                emit deposit(bidToCheck.deposit);
                emit depositValue(value);
            }
            if (!fake && bidToCheck.deposit >= value) {
                if (placeBid(msg.sender, value, _id))
                    refund -= value;
            }
            // Make it impossible for the sender to re-claim
            // the same deposit.
            bidToCheck.blindedBid = bytes32(0);
        }
        msg.sender.transfer(refund);
        //emit event
        emit Revealed(msg.sender);
    }

    /// Withdraw a bid that was overbid.
    //This cant be called by js?3
    function withdraw(uint _id) public payable {
        ProductWithBids storage newProduct = internalProducts[_id];
        uint amount = newProduct.pendingReturns[msg.sender];
        if (amount > 0) {
            // It is important to set this to zero because the recipient
            // can call this function again as part of the receiving call
            // before `transfer` returns (see the remark above about
            // conditions -> effects -> interaction).
            newProduct.pendingReturns[msg.sender] = 0;

            msg.sender.transfer(amount);
        }
    }

    /// End the auction and send the highest bid
    /// to the beneficiary.
    function auctionEnd(uint _id)
    public
    payable
    onlyAfter(revealEnd)
    {
        ProductWithBids storage currentProduct = internalProducts[_id];

        require(!currentProduct.ended);
        emit AuctionEnded(
            currentProduct.highestBidder,
            currentProduct.highestBid
        );
        currentProduct.ended = true;
        beneficiary.transfer(currentProduct.highestBid);
    }

    // This is an "internal" function which means that it
    // can only be called from the contract itself (or from
    // derived contracts).
    function placeBid(address bidder, uint value, uint id) internal
    returns (bool success)
    {
        ProductWithBids storage newProduct = internalProducts[id];

        if (value <= newProduct.highestBid) {
            return false;
        }
        if (newProduct.highestBidder != address(0)) {
            // Refund the previously highest bidder.
            newProduct.pendingReturns[newProduct.highestBidder] += newProduct.highestBid;
        }
        newProduct.highestBid = value;
        newProduct.highestBidder = bidder;
        emit IWillReturnTrue();
        return true;
    }
    //End of BlindAuction


    function createProduct(string memory _name, uint _price) public {
        //Require a names
        require(bytes(_name).length > 0);
        //Require a valid price
        require(_price > 0);
        //increase product productCount
        productCount ++;
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
        //newProduct.state = State.Created;
        //trigger an event
        emit ProductCreated(productCount, _name, _price, msg.sender, false, State.Created);
    }

    function beginAuction(ProductWithBids storage product) internal {
        // We cannot use "campaigns[campaignID] = Campaign(beneficiary, goal, 0, 0)"
        // because the RHS creates a memory-struct "Campaign" that contains a mapping.
        // productWithBidsCount++;
        //ProductWithBids storage newProduct = product;

        //TODO modify it so it can support multiple auctions at the same time.

        setAuctionVars(product);
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
        //Pay the seller by sending them Ether
        _seller.transfer(msg.value);
        //trigger an event
        emit ProductPurchased(productCount, _product.name, _product.price, msg.sender, true);
        //..beginAuction
        beginAuction(_product);
    }

    /*
     * main function responsible for revealing
     * the bids.
     */
    function reveal(
        uint _id
    )
    public
    payable
    onlyAfter(biddingEnd)
    onlyBefore(revealEnd)
    {
        ProductWithBids storage selectedProduct = internalProducts[_id];
        uint count = selectedProduct.bidsCount;

        uint[] memory values = new uint[](count);
        bool[] memory fake = new bool[](count);
        string[] memory secret = new string[](count);

        for (uint i = 0; i < count; i++) {
            values[i] = selectedProduct.nakedBids[msg.sender][i].values;
            fake[i] = selectedProduct.nakedBids[msg.sender][i].fake;
            secret[i] = selectedProduct.nakedBids[msg.sender][i].secret;
        }

        //TODO call revealInternal
        revealInternal(
            values,
            fake,
            secret,
            _id
        );
    }
}






















