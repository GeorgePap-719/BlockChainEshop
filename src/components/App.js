import React, {Component} from 'react';
import Web3 from 'web3';
//import logo from '../logo.png';
import './css/App.css';
import eShop from '../abis/eShop.json';
//import BlindAuction from '../abis/BlindAuction.json';
import Navbar from './Navbar';
import Main from './Main';
import * as abi from "web3-utils";
import {keccak256} from "ethereumjs-util";
import {ethers} from "ethers";


process.title = eShop;

class App extends Component {

    // noinspection JSCheckFunctionSignatures
    async componentWillMount() {
        await this.loadWeb3()
        await this.loadBlockChainData()
    }

    //Common pattern for connecting the app to web3.
    async loadWeb3() {

        if (window.ethereum) {
            window.web3 = new Web3(window.ethereum)
            await window.ethereum.enable()
        } else if (window.web3) {
            window.web3 = new Web3(window.web3.currentProvider)
        }
        // Non-dapp browsers...
        else {
            window.alert('Non-Ethereum browser detected. You should consider trying MetaMask!')
        }
    }

    /*
     * Retrieving data from the blockChain/Smart Contracts.
     *
     */
    async loadBlockChainData() {
        const web3 = window.web3
        //load accounts
        const accounts = await web3.eth.getAccounts()
        this.setState({account: accounts[0]})
        const networkId = await web3.eth.net.getId()

        //Loading the contract's networkData ..
        const networkDataEshop = eShop.networks[networkId]
        //const networkDataBid = BlindAuction.networks[networkId]

        //Load eShop
        if (networkDataEshop) {
            const eshop = new web3.eth.Contract(eShop.abi, networkDataEshop.address)
            this.setState({eshop})

            //Loading arrays from the blockChain
            const globalBidsCount = await eshop.methods.globalBidsCount().call()
            this.setState({globalBidsCount})
            const productCount = await eshop.methods.productCount().call()
            this.setState({productCount})
            //Load products checkValidServiceWorker
            for (var i = 1; i <= productCount; i++) {
                const productWithBids = await eshop.methods.internalProducts(i).call()
                this.setState({
                    internalProducts: [...this.state.internalProducts, productWithBids]
                })
            }
            console.log("productsCount: ", productCount.toString())
            console.log("globalBids: ", globalBidsCount.toString())

            for (var j = 0; j < globalBidsCount; j++) {

                const nakedBids = await eshop.methods.nakedBids(this.state.account, j).call()
                this.setState({
                    nakedBids: [...this.state.nakedBids, nakedBids]
                })
            }

            this.setState({loading: false})
        } else {
            window.alert("eShop contract can not be deployed to detected network")
        }
    }


    constructor(props) {
        super(props);
        this.state = {
            account: '',
            productCount: 0,
            internalProducts: [],
            bidsCount: 0,
            nakedBids: [],
            globalBidsCount: 0,
            loading: true
        }
        this.createProduct = this.createProduct.bind(this)
        this.purchaseProduct = this.purchaseProduct.bind(this)
        this.bidProduct = this.bidProduct.bind(this)
        this.setUpdateBiddingEnd = this.setUpdateBiddingEnd.bind(this)//
        this.getTimeBiddingEnd = this.getTimeBiddingEnd.bind(this)//
        this.checkBidding = this.checkBidding.bind(this)//
        this.reveal = this.reveal.bind(this)
        this.withdraw = this.withdraw.bind(this)
        this.auctionEnd = this.auctionEnd.bind(this)
    }

    //Function for calling the corresponding function inside the smart contract
    checkBidding(id) {
        // this.setState({loading: true})
        //         // this.state.eshop.methods.checkBidding(id)
        //         //     .send({from: this.state.account})
        //         //     .once('receipt', (receipt) => {
        //         //         //window.location.reload()
        //         //     })
        //         // this.setState({loading: false})
        //
    }

    //Function for calling the corresponding function inside the smart contract
    createProduct(name, price) {
        this.setState({loading: true})
        console.log("emit createdProduct")

        this.state.eshop.methods.createProduct(name, price)
            .send({from: this.state.account})
            .once('receipt', (receipt) => {
                //window.location.reload()
                console.log("emit createdProduct")
            })

        this.setState({loading: false})
        //
    }

    //Function for calling the corresponding function inside the smart contract
    purchaseProduct(id, price) {
        this.setState({loading: true})
        this.state.eshop.methods.purchaseProduct(id)
            .send({from: this.state.account, value: price})
            .once('receipt', (receipt) => {

            })

        this.setState({loading: false})
        //  window.location.reload(false);
    }

    //Function for calling the corresponding function inside the smart contract
    bidProduct(price, fake, id, bidsCount) {

        this.setState({loading: true})
        const secret = "eShop";

        const blindedBid = keccak256(new Buffer(abi.encodePacked(
            parseInt(price),
            fake,
            secret
        )))

        //TODO impl support for multiple users.
        //tempBid + this.state.account
        //Another idea is to make BidsCount 2d and store this.state.account

        const _price = window.web3.utils.fromWei(price.toString(), 'ether');

        console.log(parseInt(_price) + ": price");
        console.log("tempBid First Look : ", bidsCount);

        this.state.eshop.methods.checkBidding(
            id,
            blindedBid,
            _price,
            fake,
            secret
        )
            .send({from: this.state.account, value: price})
            .once('receipt', (receipt) => {
                //window.location.reload()
            })


        this.setState((state) => {
                return {
                    loading: false,
                }
            },
            () => {
                console.log("New bid: ",
                    parseInt(price),
                    fake,
                    secret)
            })

    }

    /// Reveal your blinded bids. You will get a refund for all
    /// correctly blinded invalid bids and for all bids except for
    /// the totally highest.
    reveal() {

        this.setState({loading: true})

        let _price = [];
        let _fake = [];
        let _secret = [];

        let bids = this.state.nakedBids

        console.log("bids: ", bids);

        this.state.nakedBids.forEach(bids => {
                _price.push(bids.values)
                _fake.push(bids.fake)
                const secret32Byte = this.web3StringToBytes32(bids.secret)
                _secret.push(secret32Byte)
            }
        )

        console.log("_price: ", _price)
        console.log("_fake: ", _fake)
        console.log("_secret: ", _secret)

        // TODO this throws undefined map
        this.state.eshop.methods.reveal(
            _price,
            _fake,
            _secret
        )
            .send({from: this.state.account})
            .once('receipt', (receipt) => {
                    //window.location.reload()
                },
                () => {
                    console.log("bids.values: ", bids.values)
                    console.log("bids.fake: ", bids.fake)
                    console.log("bids.secret: ", bids.secret)
                })

        this.setState({loading: false})
    }

    /*
     * https://github.com/ethers-io/ethers.js/issues/66
     * To mimic the web3 coercion of short string into bytes32
     * for legacy byte32[] arguments.
     */
    web3StringToBytes32(text) {
        var result = ethers.utils.hexlify(ethers.utils.toUtf8Bytes(text));
        while (result.length < 66) {
            result += '0';
        }
        if (result.length !== 66) {
            throw new Error("invalid web3 implicit bytes32");
        }
        return result;
    }


    //Withdraw a bid that was overbid.
    withdraw() {
        this.setState({loading: true})

        if (this.state.eshop)
        this.state.eshop.methods.withdraw()
            .send({from: this.state.account})
            .once('receipt', (receipt) => {

            })

        this.setState({loading: false})
    }

    auctionEnd() {
        this.setState({loading: true})

        if (this.state.eshop)
            this.state.eshop.methods.auctionEnd()
                .send({from: this.state.account})
                .once('receipt', (receipt) => {

                })

        this.setState({loading: false})
    }


    getTimeBiddingEnd() {
        //TODO
    }

    /*
    * Error info:
    * It doesnt recognise the eshop var for some reason.
    */
    setUpdateBiddingEnd(id, biddingTime) {
        // this.setState({loading: true})
        // this.state.eshop.methods.updateBiddingEnd(id, biddingTime)
        //     .send({from: this.state.account })
        //     .once('receipt', (receipt) => {
        //
        //     })
        // this.setState({ loading: false })
        // // //TODO fix the error
    }

    render() {
        return (
            <div>
                <Navbar account={this.state.account}/>
                <div className="container-fluid mt-5">
                    <div className="row">
                        <main role="main" className="col-lg-12 d-flex">
                            {this.state.loading
                                ?
                                <div id="loader" className="text-center"><p className="text-center">Loading...</p></div>
                                : <Main
                                    internalProducts={this.state.internalProducts}
                                    bids={this.state.bids}
                                    createProduct={this.createProduct}
                                    purchaseProduct={this.purchaseProduct}
                                    setUpdateBiddingEnd={this.setUpdateBiddingEnd}
                                    bidProduct={this.bidProduct}
                                    reveal={this.reveal}
                                    withdraw={this.withdraw}
                                    auctionEnd={this.auctionEnd}
                                    checkBidding={this.checkBidding}
                                />
                            }
                        </main>
                    </div>
                </div>
            </div>
        );
    }
}

export default App;
