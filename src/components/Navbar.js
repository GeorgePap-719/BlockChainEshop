import React, {Component} from 'react';

class Navbar extends Component {

    render() {
        //-dark fixed-top bg-dark flex-md-nowrap p-0 shadow
        return (
            <nav className="navbar  bg-danger fixed-top  flex-md-nowrap p-0 shadow">
                <a
                    className="navbar-brand col-sm-3 col-md-2 mr-0"
                    href="https://github.com/GeorgePap-719/BlockChainEshop"
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    Dapp eShop Blockchain
                </a>
                <ul className="navbar-nav px-3">
                    <li className="nav-item text-nowrap d-none d-sm-none d-sm-block">
                        <small className="text-white"><span id="account">{this.props.account}</span></small>
                    </li>
                </ul>
            </nav>
        );
    }
}

export default Navbar;
