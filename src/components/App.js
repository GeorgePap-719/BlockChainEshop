import React, {Component} from 'react';
import Web3 from 'web3';
//import logo from '../logo.png';
import './css/App.css';
import eShop from '../abis/eShop.json';
//import BlindAuction from '../abis/BlindAuction.json';
import Navbar from './Navbar';
import Main from './Main';


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
        this.reveal = this.reveal.bind(this)
        this.withdraw = this.withdraw.bind(this)
        this.auctionEnd = this.auctionEnd.bind(this)
    }


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


    purchaseProduct(id, price) {
        this.setState({loading: true})
        this.state.eshop.methods.purchaseProduct(id)
            .send({from: this.state.account, value: price})
            .once('receipt', (receipt) => {

            })

        this.setState({loading: false})
        //  window.location.reload(false);
    }

    bidProduct(price, fake, id, bidsCount) {

        this.setState({loading: true})

        // console.log("before cast fake: ", fake)
        console.log("fake :", fake)

        const secret = "eShop";
        const _price = window.web3.utils.fromWei(price.toString(), 'Ether');

        const blindedBid = window.web3.utils.soliditySha3(
            {t: 'uint', v: price}, //parseInt(_price)
            {t: 'bool', v: fake},
            {t: 'string', v: secret}
        );

        //TODO impl support for multiple users.

        console.log(parseInt(_price) + ": price");
        console.log("tempBid First Look : ", bidsCount);

        this.state.eshop.methods.checkBidding(
            id,
            blindedBid,
            price,
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
                    parseInt(_price),
                    fake,
                    secret)
            })

    }

    /// Reveal your blinded bids. You will get a refund for all
    /// correctly blinded invalid bids and for all bids except for
    /// the totally highest.
    reveal(id) {
        this.setState({loading: true})

        this.state.eshop.methods.reveal(id)
            .send({from: this.state.account})
            .once('receipt', (receipt) => {
                    //window.location.reload()
                },
                () => {
                    console.log("revealed")
                })

        this.setState({loading: false})
    }

    /*
     * https://github.com/ethers-io/ethers.js/issues/66
     * To mimic the web3 coercion of short string into bytes32
     * for legacy byte32[] arguments.
     */
    // web3StringToBytes32(text) {
    //     var result = ethers.utils.hexlify(ethers.utils.toUtf8Bytes(text));
    //     while (result.length < 66) {
    //         result += '0';
    //     }
    //     if (result.length !== 66) {
    //         throw new Error("invalid web3 implicit bytes32");
    //     }
    //     return result;
    // }


    //Withdraw a bid that was overbid.
    withdraw(id) {
        this.setState({loading: true})

        if (this.state.eshop)
            this.state.eshop.methods.withdraw(id)
                .send({from: this.state.account})
                .once('receipt', (receipt) => {

                })

        this.setState({loading: false})
    }

    auctionEnd(id) {
        this.setState({loading: true})

        if (this.state.eshop)
            this.state.eshop.methods.auctionEnd(id)
                .send({from: this.state.account})
                .once('receipt', (receipt) => {

                })

        this.setState({loading: false})
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
                                    bidProduct={this.bidProduct}
                                    reveal={this.reveal}
                                    withdraw={this.withdraw}
                                    auctionEnd={this.auctionEnd}
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
