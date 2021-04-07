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
    //BlindAuction
    address payable public beneficiary;//seller
    //Money for paying the transporter(winner of the auction),
    //can not be more than the item's price.
    mapping(uint => uint) public transportDeposit;

    mapping(uint => ProductWithBids) public internalProducts;
    /*
     * this struct serves only for storing extra
     * variables since solidity structs can not handle
     * more than 16 entries in the struct otherwise we
     * will get error:
     * Stack too deep when compiling inline assembly.
     */
    mapping(uint => AdditionalVars) private extraProductVars;
    uint public globalBidsCount = 0;

    modifier maxValue(uint id) {
        require(
            msg.value <= transportDeposit[id],
            "Bid can not be more than item's price"
        );
        _;
    }

    // Not used at the moment.
    //    modifier onlyBefore(uint _time) {require(block.timestamp < _time);
    //        _;}
    //    modifier onlyAfter(uint _time) {require(block.timestamp > _time);
    //    _;}

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
        address payable lowestBidder;
        uint lowestBid;
    }

    struct AdditionalVars {
        uint id;
        bool firstTime;
    }


    event ProductCreated(
        uint id,
        string name,
        uint price,
        address payable owner,
        bool purchased
    );

    event ProductPurchased(
        uint id,
        string name,
        uint price,
        address payable owner,
        bool purchased
    );

    //Delete them after merge with master
    //these events are meant only for DEVs
    event isTrue(bool flag);
    event isFalse(bool flag);
    event deposit(uint value);
    event depositValue(uint value);
    event IWillReturnTrue();
    event DidNotMeetRequireYet();
    event NotRevealedYet(address refunded);
    //End event DEVs

    event NewAuctionBegins();
    event AuctionEnded(address winner, uint highestBid);
    event Revealed(address refunded);

    /// Ensure that `msg.value` is an even number.
    /// Division will truncate if it is an odd number.
    /// Check via multiplication that it wasn't an odd number
    constructor() payable {
        name = "Dapp eShop";
    }

    //noinspection UnprotectedFunction
    function createProduct(
        string memory _name,
        uint _price
    )
    public
    payable
    {
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
         *
         * Also We cannot use "internalProducts[productCount] = ProductWithBids(id, name, price , etc)"
         * because the RHS creates a memory-struct "ProductWithBids" that contains a mapping.
         */
        //create the product
        ProductWithBids storage newProduct = internalProducts[productCount];
        AdditionalVars storage extraVars = extraProductVars[productCount];
        //TODO Impl transportDeposit mechanism.
        extraVars.id = productCount;
        newProduct.id = productCount;
        newProduct.name = _name;
        newProduct.price = _price;
        newProduct.owner = msg.sender;
        newProduct.beneficiary = msg.sender;
        newProduct.purchased = false;
        transportDeposit[productCount] = msg.value;
        //trigger an event
        emit ProductCreated(productCount, _name, _price, msg.sender, false);
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
        //beginAuction
        beginAuction(_id);
    }

    /// Start of BlindAuction
    /// In a real world scenario this function should
    /// call only the bid function because the nakedBids
    /// should have been an external input from another
    /// contract or application.
    function checkBidding(
        uint _id,
        bytes32 _blindedBid,
        uint _values,
        bool _fake,
        string memory _secret
    )
    public
    payable
    maxValue(_id)
    {
        ProductWithBids storage selectedProduct = internalProducts[_id];
        //onlyBefore biddingEnd
        require(block.timestamp < selectedProduct.biddingEnd);

        bid(_blindedBid, _id);
        pushNakedBids(
            _values,
            _fake,
            _secret,
            _id
        );
        selectedProduct.bidsCount++;
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
    function bid(
        bytes32 _blindedBid,
        uint id
    )
    public
    payable
    {
        ProductWithBids storage selectedProduct = internalProducts[id];
        //onlyBefore biddingEnd
        //require(block.timestamp < newProduct.biddingEnd);

        selectedProduct.bids[msg.sender].push(Bid({
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
        ProductWithBids storage selectedProduct = internalProducts[id];

        selectedProduct.nakedBids[msg.sender].push(SecretBids({
        values : _values,
        fake : _fake,
        secret : _secret
        }));
    }

    /// Secret is just the required string for the matching encoding.
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
    {
        ProductWithBids storage selectedProduct = internalProducts[_id];
        //onlyAfter biddingEnd && onlyBefore revealEnd
        require(block.timestamp > selectedProduct.biddingEnd);
        require(block.timestamp < selectedProduct.revealEnd);

        uint length = selectedProduct.bids[msg.sender].length;
        require(_values.length == length);
        require(_fake.length == length);
        require(_secret.length == length);

        uint refund;
        for (uint i = 0; i < length; i++) {
            Bid storage bidToCheck = selectedProduct.bids[msg.sender][i];
            (uint value, bool fake, string memory secret) =
            (_values[i], _fake[i], _secret[i]);
            if (bidToCheck.blindedBid != keccak256(abi.encodePacked(value, fake, secret))) {
                // Bid was not actually revealed.
                // Do not refund deposit.
                emit NotRevealedYet(msg.sender);
                continue;
            }
            refund += bidToCheck.deposit;
            if (fake) {
                emit isTrue(fake);
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
    function withdraw(
        uint _id
    )
    public
    payable
    {
        ProductWithBids storage selectedProduct = internalProducts[_id];
        uint amount = selectedProduct.pendingReturns[msg.sender];
        if (amount > 0) {
            // It is important to set this to zero because the recipient
            // can call this function again as part of the receiving call
            // before `transfer` returns .
            selectedProduct.pendingReturns[msg.sender] = 0;

            msg.sender.transfer(amount);
        }
    }

    /// End the auction and send the highest bid
    /// to the beneficiary.
    function auctionEnd(uint _id) public payable {
        ProductWithBids storage selectedProduct = internalProducts[_id];
        //onlyAfter revealEnd
        require(block.timestamp > selectedProduct.revealEnd);

        require(!selectedProduct.ended);
        emit AuctionEnded(
            selectedProduct.lowestBidder,
            selectedProduct.lowestBid
        );

        // It is important to place this if because the recipient
        // can call this function again as part of the receiving call
        // before `transfer` returns .
        if (transportDeposit[_id] - selectedProduct.lowestBid >= 0 && !selectedProduct.ended) {
            selectedProduct.lowestBidder.transfer(selectedProduct.lowestBid + selectedProduct.lowestBid);
            transportDeposit[_id] -= selectedProduct.lowestBid;
        }

        refundSeller(
            selectedProduct.beneficiary,
            _id
        );
        selectedProduct.ended = true;
    }

    /// The main function responsible for revealing
    /// the bids. In a real world scenario this
    /// function should be a separate contract or
    /// app, because this contract simulates an
    /// external input.
    function reveal(uint _id) public payable {
        ProductWithBids storage selectedProduct = internalProducts[_id];
        //onlyAfter biddingEnd && onlyBefore revealEnd
        require(block.timestamp > selectedProduct.biddingEnd, "onlyAfter biddingEnd");
        require(block.timestamp < selectedProduct.revealEnd, "onlyBefore revealEnd");
        uint count = selectedProduct.bidsCount;

        uint[] memory values = new uint[](count);
        bool[] memory fake = new bool[](count);
        string[] memory secret = new string[](count);

        for (uint i = 0; i < count; i++) {
            values[i] = selectedProduct.nakedBids[msg.sender][i].values;
            fake[i] = selectedProduct.nakedBids[msg.sender][i].fake;
            secret[i] = selectedProduct.nakedBids[msg.sender][i].secret;
        }

        revealInternal(
            values,
            fake,
            secret,
            _id
        );
    }

    function beginAuction(uint _id) internal {
        ProductWithBids storage selectedProduct = internalProducts[_id];
        AdditionalVars storage extraVars = extraProductVars[_id];
        //Init Auction Vars
        extraVars.firstTime = true;
        selectedProduct.lowestBid = 0;
        selectedProduct.ended = false;
        selectedProduct.bidsCount = 0;
        selectedProduct.biddingEnd = block.timestamp + 40;
        selectedProduct.revealEnd = selectedProduct.biddingEnd + 60;
        //trigger an event
        emit NewAuctionBegins();
    }

    /// This is an "internal" function which means that it
    /// can only be called from the contract itself (or from
    /// derived contracts).
    function placeBid(
        address payable bidder,
        uint value,
        uint id
    )
    internal
    returns (bool success)
    {
        ProductWithBids storage selectedProduct = internalProducts[id];
        AdditionalVars storage extraVars = extraProductVars[id];

        //TODO this is reversed.
        if (value >= selectedProduct.lowestBid && !extraVars.firstTime)
            return false;
        else
            extraVars.firstTime = false;

        if (selectedProduct.lowestBidder != address(0)) {
            // Refund the previously highest bidder.
            selectedProduct.pendingReturns[selectedProduct.lowestBidder] += selectedProduct.lowestBid;
        }
        selectedProduct.lowestBid = value;
        selectedProduct.lowestBidder = bidder;
        emit IWillReturnTrue();
        return true;
    }
    //End of BlindAuction

    function refundSeller(
        address payable _seller,
        uint _id
    )
    public
    payable
    {
        uint amount = transportDeposit[_id];
        if (amount > 0) {
            _seller.transfer(amount);
            // It is important to set this to zero because the recipient
            // can call this function again as part of the receiving call
            // before `transfer` returns .
            transportDeposit[_id] = 0;
        } else if (amount < 0) {
            //emit event about the state
            //of transportDeposit[_id].
        }
    }
}






















