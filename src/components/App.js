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


process.title = eShop;

class App extends Component {

    currentValues = [[], [],];
    currentFake = [[], [],];
    currentSecret = [[], [],];

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
            const productCount = await eshop.methods.productCount().call()
            this.setState({productCount})
            //Load products checkValidServiceWorker
            for (var i = 1; i <= productCount; i++) {
                // const product = await eshop.methods.products(i).call()
                // this.setState({
                //     products: [...this.state.products, product]
                // })
                const productWithBids = await eshop.methods.internalProducts(i).call()
                this.setState({
                    internalProducts: [...this.state.internalProducts, productWithBids]
                })

            }
            console.log(productCount.toString())

            // const bidsCount = await eshop.methods.bidsCount().call()
            // this.setState({bidsCount})

            // for (var i = 1; i <= bidsCount; i++) {
            //
            //     // TODO impl?.
            //     // The problem is  i cant find the appropriate address with simple way and not
            //     // scrolling all the abi every time .
            //     // const productBids = await eshop.methods.bids('needRightAddress', i).call()
            //     // this.setState({
            //     //     bids: [...this.state.bids, productBids]
            //     // })
            // }


            this.setState({loading: false})
        } else {
            window.alert("eShop contract can not be deployed to detected network")
        }
    }


    // setUpdateBiddingEnd = (id, biddingTime) => {
    //     this.setState({loading: true})
    //     this.state.eshop.methods.updateBiddingEnd(id, biddingTime)
    //         .send({ from: this.state.account }).on('transactionHash', (hash) => {
    //         this.setState({ loading: false })
    //     })
    //
    // }

    constructor(props) {
        super(props)
        this.state = {
            account: '',
            productCount: 0,
            internalProducts: [],
            bidsCount: 0,
            bids: [],
            loading: true
        }
        this.createProduct = this.createProduct.bind(this)
        this.purchaseProduct = this.purchaseProduct.bind(this)
        this.bidProduct = this.bidProduct.bind(this)
        this.setUpdateBiddingEnd = this.setUpdateBiddingEnd(this)
        this.getTimeBiddingEnd = this.getTimeBiddingEnd(this)
        this.checkBidding = this.checkBidding(this)
        this.reveal = this.reveal(this)
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
        this.state.eshop.methods.createProduct(name, price)
            .send({from: this.state.account})
            .once('receipt', (receipt) => {
                //window.location.reload()
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
    bidProduct(price, fake, id) {
        this.setState({loading: true})
        let secret = "eShop";

        const blindedBid = keccak256(abi.encodePacked(
            price,
            fake,
            secret
        ))


        //TODO impl support for multiple users.
        this.currentValues.push(this.props.account, price);
        this.currentFake.push(this.props.account, fake);
        this.currentSecret.push(this.props.account, secret)

        // this.currentBids.push(this.props.account, blindedBid)

        this.state.eshop.methods.checkBidding(id)
            .send({from: this.state.account})
            .once('receipt', (receipt) => {
                //window.location.reload()
            })

        this.state.eshop.methods.bid(blindedBid)
            .send({from: this.state.account, value: price})
            .once('receipt', (receipt) => {

            })

        this.setState({loading: false})
        //
    }


    /// Reveal your blinded bids. You will get a refund for all
    /// correctly blinded invalid bids and for all bids except for
    /// the totally highest.
    reveal(
        // _values,
        // _fake,
        // _secret
    ) {
        //TODO
        this.setState({loading: true})

        this.state.eshop.methods.reveal(
            this.currentValues,
            this.currentFake,
            this.currentSecret
        )
            .send({from: this.state.account})
            .once('receipt', (receipt) => {
                //window.location.reload()
            })

        this.setState({loading: false})
    }


    //Withdraw a bid that was overbid.
    withdraw() {
        //TODO
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
                                    checkBidding={this.checkBidding}
                                    reveal={this.reveal}
                                    //newAuction={this.newAuction}
                                    // biddingEndArray={this.state.biddingEndArray}
                                    // revealEndArray={this.state.revealEndArray}
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
