import React, {Component} from 'react';

//TODO create arguments for dynamic calls, aka biddingTime, revealTime.


//TODO this part needs comments..
// eslint-disable-next-line
function auctionHouse(biddingEnd, revealEnd, id) {

    let realTimeBidding;
    let realTimeReveal;
    //let now =  new Date(biddingEnd * 1000).getSeconds();//new Date().getUTCSeconds();

    //let realTime;
    let countDown;
    let secondCountDown;

    countDown = setInterval(function () {

        // console.log(JSON.parse(localStorage.getItem(id)) + " outside the loop");

        // if () {

        realTimeBidding = --biddingEnd;

        //  console.log("inside the first if the loop");
        //
        // } else {
        //     realTimeBidding[id] -= 1;
        //
        //
        // }
        // realTime = --biddingEnd;
        //console.log(localStorage.getItem(id));
        console.log(realTimeBidding);

        // console.log(realTime);

        document.getElementById("bidding").innerHTML = realTimeBidding + ":s";

        //this.props.updateBiddingEnd(id, biddingEnd)

        if (realTimeBidding === 0 || realTimeBidding < 0) {
            // myButton.addEventListener('click', myFunction); TODO
            clearInterval(countDown)
            document.getElementById("bidding").innerHTML = "Closed";

            //revealEnd = biddingEnd + 10; not needed, delete it? TODO

            secondCountDown = setInterval(function () {

                realTimeReveal = --revealEnd;

                document.getElementById("reveal").innerHTML = realTimeReveal + ":s";

                if (realTimeReveal === 0 || realTimeReveal < 0) {
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
                                                //this.props.newAuction(this.biddingEnd, this.revealEnd)
                                                //auctionHouse()
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
                        <th scope="col">Bids</th>
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
                                            type="boolean"
                                            ref={(input) => {
                                                this.productFake = input
                                            }}
                                            placeholder="Fake"
                                            required/>
                                    </div>
                                    {product.biddingTime && product.purchased
                                        ? <button

                                            onClick={(event) => {

                                                const byte32Bid = window.web3.utils.fromAscii(this.productPriceBid.value);
                                                this.props.bidProduct(
                                                    byte32Bid,
                                                    this.productFake.toString(),
                                                    product.id
                                                )
                                                //bids.push(this.props.account)
                                                //TODO impl blind auction house
                                            }}>
                                            Bid
                                        </button>
                                        : null
                                    }

                                </td>
                                <td id="reveal">{}</td>
                                <td>
                                    {(!product.biddingTime && product.revealTime && product.purchased)
                                        ? <button
                                            onClick={(event) => {
                                                //event.preventDefault()
                                                this.props.reveal()
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

}


export default Main;

















