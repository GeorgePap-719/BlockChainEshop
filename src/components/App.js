import React, { Component } from 'react';
import Web3 from 'web3';
//import logo from '../logo.png';
//import './App.css';
import eShop from '../abis/eShop.json'


class App extends Component {

  async componentWillMount() {
    await this.loadweb3()
    await this.loadBlockchainData()
  }

  async loadweb3() {

      if (window.ethereum) {
          window.web3 = new Web3(window.ethereum)
          await window.ethereum.enable()
      }
      else if (window.web3) {
          window.web3 = new Web3(window.web3.currentProvider)
      }
      // Non-dapp browsers...
      else {
          window.alert('Non-Ethereum browser detected. You should consider trying MetaMask!')
      }
  }

  async loadBlockchainData() {
    const web3 = window.web3

    //load accounts
    const accounts = await web3.eth.getAccounts()
    this.setState({account: accounts[0]})
    const networkId = await web3.eth.net.getId()
    const networkData = eShop.networks[networkId]

    if(networkData) {
      const eshop = web3.eth.Contract(eShop.abi, networkData.address)
      console.log(eshop)
    } else {

    }




  }

  constructor(props) {
    super(props)
    this.state = {
      account: '',
      productCount: 0,
      products: [],
      loading: true
    }
  }

  render() {

    return (
      <div>
        <nav className="navbar navbar-dark fixed-top bg-dark flex-md-nowrap p-0 shadow">
        <a
          className="navbar-brand col-sm-3 col-md-2 mr-0"
          href="https://github.com/GeorgePap-719/BlockChainEshop"
          target="_blank"
          rel="noopener noreferrer"
        >
          Dapp eShop Blockchain Marketplace
              </a>
              <ul className="navbar-nav px-3">
          <li className="nav-item text-nowrap d-none d-sm-none d-sm-block">
            <small className="text-white">
            <span id="account">{this.state.account}</span></small>
          </li>
        </ul>
            </nav>
          <div className="container-fluid mt-5">
            <div className="row">
        <div  className="container-fluid mt-5">
          <div className="row">
            <main role="main" className="col-lg-12 d-flex">
            </main>
            <h1>Dapp eShop</h1>
            <p>
            Edit <code>src/components/App.js</code> and save to reload.
            </p>
            </div>
          </div>
        </div>

      </div>
    </div>
    );
  }
}

export default App;
