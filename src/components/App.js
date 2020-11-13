import React, {Component} from 'react';
import Web3 from 'web3';
//import logo from '../logo.png';
import './css/App.css';
import eShop from '../abis/eShop.json';
import BlindAuction from '../abis/BlindAuction.json';
import Navbar from './Navbar';
import Main from './Main';

process.title = eShop;
process.title = BlindAuction;

class App extends Component {

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
        const networkDataBid = BlindAuction.networks[networkId]

        //Load eShop
        if (networkDataEshop) {
            const eshop = new web3.eth.Contract(eShop.abi, networkDataEshop.address)
            this.setState({eshop})

            //Loading arrays from the blockChain
            const productCount = await eshop.methods.productCount().call()
            this.setState({productCount})
            //Load products checkValidServiceWorker
            for (var i = 1; i <= productCount; i++) {
                const product = await eshop.methods.products(i).call()
                this.setState({
                    products: [...this.state.products, product]
                })
            }
            console.log(productCount.toString())
            this.setState({loading: false})
        } else {
            window.alert("eShop contract can not be deployed to detected network")
        }

        //delete it if we wont use it anymore TODO
        // //Load BlindAuction
        // if (networkDataBid) {
        //     // eslint-disable-next-line
        //     const blindAuction = web3.eth.Contract(BlindAuction.abi, networkDataBid.address)
        //     this.setState({blindAuction})
        //
        //     //Load Bidding,Reveal time
        //     // const biddingEnd = await blindAuction.methods.biddingEnd().call()
        //     // this.setState({biddingEnd})
        //     //
        //     // const revealEnd = await blindAuction.methods.revealEnd().call()
        //     // this.setState({revealEnd})
        //
        //
        // } else {
        //     window.alert("BlindAuction contract can not be deployed to detected network")
        // }

    }

    constructor(props) {
        super(props)
        this.state = {
            account: '',
            productCount: 0,
            products: [],
            loading: true
        }
        this.createProduct = this.createProduct.bind(this)
        this.purchaseProduct = this.purchaseProduct.bind(this)
        this.newAuction = this.newAuction.bind(this)
        this.bidProduct = this.bidProduct.bind(this)
    }

    //Function for calling the corresponding function inside the smart contract
    createProduct(name, price) {
        this.setState({loading: true})
        this.state.eshop.methods.createProduct(name, price).send({from: this.state.account})
            .once('receipt', (receipt) => {

            })
        this.setState({loading: false})
        //
    }

    //Function for calling the corresponding function inside the smart contract
    purchaseProduct(id, price) {
        this.setState({loading: true})
        this.state.eshop.methods.purchaseProduct(id)
            .send({from: this.state.account, value: price}).once
        ('receipt', (receipt) => {

        })
        this.setState({loading: false})
        //  window.location.reload(false);
    }

    //Function for calling the corresponding function inside the smart contract
    bidProduct(price) {
        // this.setState({loading: true})
        // this.state.blindAuction.methods.bid(price)
        //     .send({from: this.state.account, value: price})
        //     .once('receipt', (receipt) => {
        //
        //     })
        // this.setState({loading: false})
        // //
    }

    newAuction(biddingEnd, revealEnd) {
        // this.setState({loading: true});
        // this.state.blindAuction.methods.newAuction(biddingEnd, revealEnd)
        //     .send({from: this.state.account})
        //     .once('receipt', (receipt) => {
        //
        //     });
        // this.setState({loading: false})
        //
    }

    /// Reveal your blinded bids. You will get a refund for all
    /// correctly blinded invalid bids and for all bids except for
    /// the totally highest.
    revealBids() {
        //TODO
    }

    //Withdraw a bid that was overbid.
    withdraw() {
        //TODO
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
                                    products={this.state.products}
                                    createProduct={this.createProduct}
                                    purchaseProduct={this.purchaseProduct}
                                    bidProduct={this.bidProduct}
                                    newAuction={this.newAuction}/>
                            }
                        </main>
                    </div>
                </div>
            </div>
        );
    }
}

export default App;
