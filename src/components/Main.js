import React, {Component} from 'react';

//TODO create arguments for dynamic calls, aka biddingTime, revealTime.
function auctionHouse() {

    let biddingEnd = 10;
    let revealEnd = biddingEnd + 10; // biddingTime + reveal
    let realTime;
    let countDown;
    let secondCountDown;

    countDown = setInterval(function () {

        realTime = --biddingEnd;
        // console.log(realTime);

        document.getElementById("bidding").innerHTML = realTime + ":s";


        if (realTime === 0) {
            // myButton.addEventListener('click', myFunction); TODO
            clearInterval(countDown)
            document.getElementById("bidding").innerHTML = "Closed";

            revealEnd = biddingEnd + 10;

            secondCountDown = setInterval(function () {

                realTime = --revealEnd;

                document.getElementById("reveal").innerHTML = realTime + ":s";

                if (realTime === 0) {
                    clearInterval(secondCountDown)
                    document.getElementById("reveal").innerHTML = "Revealed";
                    //ButtonAction
                }
            }, 1000)


            // document.getElementById("reveal").innerHTML ="Closed";
        }
    }, 1000)

}


class Main extends Component {
    bid = 1;
    biddingEnd = 60;
    revealEnd = 60;

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
                        <th scope="col"></th>
                    </tr>
                    </thead>
                    <tbody id="productList">
                    {this.props.products.map((product, key) => {
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
                                                this.props.newAuction(this.biddingEnd, this.revealEnd)
                                                auctionHouse()
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
                        <th scope="col"></th>
                        <th scope="col">RevealTime</th>
                        <th scope="col"></th>
                    </tr>

                    </thead>

                    <tbody id="ProductsForBiding">
                    {this.props.products.map((product, key) => {
                        return (
                            <tr key={key}>
                                <th scope="row">{product.id.toString()}</th>
                                <td>{product.name}</td>
                                <td>{window.web3.utils.fromWei
                                (product.price.toString(), 'Ether')} Eth
                                </td>
                                <td>{product.owner}</td>
                                <td id="bidding"> {}</td>
                                <td className="bidColumn">
                                    {this.biddingEnd > 0
                                        ? <button
                                            name={product.id}
                                            value={product.price}
                                            onClick={(event) => {
                                                const byte32Bid = window.web3.utils.fromAscii(this.bid)
                                                this.props.bidProduct(byte32Bid)
                                                //TODO impl blind auction house
                                            }}>
                                            Bid
                                        </button>
                                        : null
                                    }

                                </td>
                                <td id="reveal">{}</td>
                                <td>
                                    {this.biddingEnd === 0
                                        ? <button
                                            onClick={(event) => {
                                                const byte32Bid = window.web3.utils.fromAscii(this.bid)
                                                this.props.bidProduct(byte32Bid)
                                                //TODO impl blind auction house
                                                //TODO change this button to reveal
                                            }}>
                                            Reveal
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


    // bidTime = setInterval(function (realTime = this["biddingEnd"]) {
    //     // let now = new Date().getTime();
    //
    //     --realTime;
    //     // --this["biddingEnd"] ;
    //
    //     //realTime = biddingEnd - 1;
    //     console.log(realTime)
    //
    //     document.getElementById("bidding").innerHTML = realTime + ":s";
    //
    //     if (realTime === 0) {
    //         // myButton.addEventListener('click', myFunction); TODO
    //         clearInterval(this.bidTime)
    //     }
    //
    // }, 1000)


}


export default Main;

















