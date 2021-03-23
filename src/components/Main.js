import React, {Component} from 'react';

function countDownTimer(time, id) {

    let realTime;
    let countDown;
    countDown = setInterval(function () {

        realTime = --time;
        // console.log(realTime);

        if (id === "bidding")
            document.getElementById("bidding").innerHTML = realTime + ":s";
        else
            document.getElementById("reveal").innerHTML = realTime + ":s";

        if (realTime <= 0) {
            clearInterval(countDown)
            if (id === "bidding")
                document.getElementById("bidding").innerHTML = "Closed";
            else
                document.getElementById("reveal").innerHTML = "Revealed";
        }
    }, 1000)
}

String.prototype.toBoolean = function () {
    let dictionary = {"true": true, "false": false};
    return dictionary[this];
};

class Main extends Component {

    render() {
        return (
            <div id="content">
                <h1>Add Product</h1>
                <form onSubmit={(event) => {
                    event.preventDefault()
                    const name = this.productName.value
                    const price = window.web3.utils.toWei(this.productPrice.value.toString(), 'Ether')
                    this.props.createProduct(name, price)
                }}>
                    <div className="form-group mr-sm-2">
                        <input
                            id="productName"
                            type="text"
                            ref={(input) => {
                                this.productName = input
                            }}
                            className="form-control"
                            placeholder="Product Name"
                            required/>
                    </div>
                    <div className="form-group mr-sm-2">
                        <input
                            id="productPrice"
                            type="text"
                            ref={(input) => {
                                this.productPrice = input
                            }}
                            className="form-control"
                            placeholder="Product Price"
                            required/>
                    </div>
                    <button type="submit" className="btn btn-primary">Add Product</button>
                </form>
                <p></p>
                <h2>Buy Product</h2>
                <table className="table">
                    <thead>
                    <tr>
                        <th scope="col">#</th>
                        <th scope="col">Name</th>
                        <th scope="col">Price</th>
                        <th scope="col">Owner</th>
                        <th scope="col"/>

                    </tr>
                    </thead>
                    <tbody id="productList">
                    {this.props.internalProducts.map((product, key) => {
                        return (
                            <tr key={key}>
                                <th scope="row">{product.id.toString()}</th>
                                <td>{product.name}</td>
                                <td>{window.web3.utils.fromWei
                                (product.price.toString(), 'Ether')} Eth
                                </td>
                                <td>{product.owner}</td>
                                <td></td>
                                <td></td>
                                <td>
                                    {!product.purchased
                                        ? <button
                                            name={product.id}
                                            value={product.price}
                                            onClick={(event) => {
                                                this.props.purchaseProduct(event.target.name, event.target.value)
                                            }}>
                                            Buy & Begin Auction
                                        </button>
                                        : null
                                    }
                                </td>
                            </tr>
                        )
                    })}

                    </tbody>
                </table>
                <h3>Bid On Products For Shipping</h3>
                <table className="table">
                    <thead>
                    <tr>
                        <th scope="col">#</th>
                        <th scope="col">Name</th>
                        <th scope="col">Price</th>
                        <th scope="col">Owner</th>
                        <th scope="col">BiddingTime</th>
                        <th scope="col"/>
                        <th scope="col">RevealTime</th>
                        <th scope="col">Bids</th>
                        <th scope="col">WithDraw</th>

                    </tr>

                    </thead>

                    <tbody id="ProductsForBiding">
                    {this.props.internalProducts.map((product, key) => {
                        return (
                            <tr key={key}>
                                <th scope="row">{product.id.toString()}</th>
                                <td>{product.name}</td>
                                <td>{window.web3.utils.fromWei
                                (product.price.toString(), 'Ether')} Eth
                                </td>
                                <td>{product.owner}</td>

                                <td id="bidding">
                                    {
                                        //TODO change this later when states will be completed.
                                        product.biddingEnd - Math.floor(Date.now() / 1000) < 0 || isNaN(product.biddingEnd)
                                            ? null
                                            :
                                            countDownTimer(product.biddingEnd - Math.floor(Date.now() / 1000), "bidding")
                                    }
                                </td>
                                <td className="bidColumn">
                                    <div>
                                        <input
                                            id="productPrice bid"
                                            type="text"
                                            ref={(input) => {
                                                this.productPriceBid = input
                                            }}
                                            placeholder="Bid"
                                            required/>
                                        <input
                                            id="productFake bid"
                                            type="bool" //TODO needs checking
                                            ref={(input) => {
                                                this.productFake = input
                                            }}
                                            placeholder="Fake"
                                            required/>
                                    </div>

                                    {


                                        product.purchased //&&
                                            // product.biddingEnd - Math.floor(Date.now() / 1000) > 0
                                            ? <button
                                                onClick={(event) => {
                                                    console.log("productFake :", this.productFake.value)
                                                    const price = window.web3.utils.toWei(this.productPriceBid.value.toString(), 'Ether');
                                                    this.props.bidProduct(
                                                        price,
                                                        this.productFake.value.toBoolean(),
                                                        product.id,
                                                        product.bidsCount
                                                    )
                                                }}>
                                                Bid
                                            </button>
                                            : null
                                    }

                                </td>
                                <td id="reveal">
                                    {
                                        product.revealEnd - Math.floor(Date.now() / 1000) > 0 &&
                                        product.biddingEnd - Math.floor(Date.now() / 1000) < 0 &&
                                        !isNaN(product.revealEnd)
                                            ? countDownTimer(product.revealEnd - Math.floor(Date.now() / 1000),
                                            "false")
                                            : null
                                    }
                                </td>
                                <td>
                                    {
                                        // product.revealEnd - Math.floor(Date.now() / 1000) > 0 &&
                                        product.biddingEnd - Math.floor(Date.now() / 1000) < 0 //&&
                                            // !isNaN(product.revealEnd)
                                            ? <button
                                                onClick={(event) => {
                                                    this.props.reveal(product.id)
                                                }}>
                                                Reveal
                                            </button>
                                            : null
                                    }
                                </td>
                                <td>
                                    {product.bidsCount.toString()}
                                </td>
                                <td id="withdraw">{}</td>
                                <td>
                                    {
                                        product.revealEnd - Math.floor(Date.now() / 1000) < 0 &&
                                        product.biddingEnd - Math.floor(Date.now() / 1000) < 0 &&
                                        !isNaN(product.revealEnd) &&
                                        product.purchased
                                            ? <button
                                                onClick={(event) => {
                                                    this.props.withdraw(product.id);
                                                }}>
                                                withdraw
                                            </button>
                                            : null
                                    }
                                </td>
                                <td>
                                    {
                                        product.revealEnd - Math.floor(Date.now() / 1000) < 0 &&
                                        product.biddingEnd - Math.floor(Date.now() / 1000) < 0 &&
                                        !isNaN(product.revealEnd) &&
                                        product.purchased
                                            ? <button
                                                onClick={(event) => {
                                                    this.props.auctionEnd(product.id);
                                                }}>
                                                EndAuction
                                            </button>
                                            : null
                                    }
                                </td>

                            </tr>

                        )
                    })

                    }
                    </tbody>
                </table>

            </div>
        );
    }

}


export default Main;

















