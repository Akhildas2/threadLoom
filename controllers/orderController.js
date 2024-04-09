const CartItems = require('../models/cartModel');
const Address = require('../models/addressModel');
const Order = require('../models/orderModel');
const paypal = require('paypal-rest-sdk');
const Product = require('../models/productModel')




// Create PayPal environment
paypal.configure({
    'mode': 'sandbox', // sandbox or live
    'client_id': process.env.PAYPAL_CLIENT_ID,
    'client_secret': process.env.PAYPAL_CLIENT_SECRET
});

//Function to generate a random orderId
function generateRandomString(length) {
    const numberSet = '0123456789';

    let result = 'threadLoom';
    for (let i = 0; i < length; i++) {
        const randomIndex = Math.floor(Math.random() * numberSet.length);
        result += numberSet.charAt(randomIndex);
    }
    return result;
}


// Function to truncate description if it exceeds PayPal's limits
function truncateDescription(description) {
    const maxLength = 127; // Maximum length allowed by PayPal
    if (description.length > maxLength) {
        return description.substring(0, maxLength); // Truncate description
    }
    return description;
}




//for checkout process
const checkout = async (req, res) => {
    const userId = req.session.user_id;
    try {
        const cartItems = await CartItems.find({ user: userId }).populate('productId');

        let totalPrice = 0;
        cartItems.forEach(item => {
            item.subtotal = item.price * item.quantity;
            totalPrice += item.subtotal;
        });
        const address = await Address.find({ userId: userId });

        res.render('checkout', { req, cartItems, totalPrice, address });

    } catch (error) {
        console.error(error.message);
        return res.status(500).json({ success: false, message: 'Internal Server Error. Please try again later.' });
    }
};


//for place order
const placeOrder = async (req, res) => {
    try {
        const userId = req.session.user_id;
        const { items, total, addressId, paymentMethod } = req.body;
        const address = await Address.findById(addressId);
        if (!address) {
            return res.status(404).json({ message: 'Address not found.' });
        }
        const expectedDelivery = new Date();
        expectedDelivery.setDate(expectedDelivery.getDate() + 5);
        const randomOrderId = generateRandomString(5);
        console.log("randomOrderId",randomOrderId);
        if (paymentMethod !== 'cod' && paymentMethod !== 'paypal') {
            return res.status(400).json({ message: 'Invalid payment method.' });
        }

        // Check if the payment method is PayPal
        if (paymentMethod === 'paypal') {
            const itemTotal = items.reduce((total, item) => total + (item.price * item.quantity), 0);

            // Save order details
            const order = new Order({
                userId: userId,
                ordersId: randomOrderId,
                deliveryAddress: address.toObject(),
                totalAmount: parseFloat(total),
                expectedDelivery: expectedDelivery,
                paymentMethod: paymentMethod,
                items: items.map((item) => ({
                    productId: item.productId._id,
                    quantity: item.quantity,
                    price: item.price,
                    total: item.price * item.quantity,
                }))
            });

            // Save the order to the database
            const savedOrder = await order.save();



            const orderId = savedOrder._id;

            // Create PayPal payment request
            const create_payment_json = {
                "intent": "sale",
                "payer": {
                    "payment_method": "paypal"
                },
                "redirect_urls": {
                    "return_url": `http://localhost:3434/order/paymentSuccess/${orderId}`,
                    "cancel_url": `http://localhost:3434/order/paymentCancel/${orderId}`
                },
                "transactions": [{
                    "amount": {
                        "currency": "USD",
                        "total": itemTotal
                    },
                    "description": items.description,
                    "item_list": {
                        "items": items.map(item => ({
                            "name": item.productId.name,
                            "description": truncateDescription(item.productId.description),
                            "quantity": item.quantity,
                            "price": item.price,
                            "currency": "USD"
                        }))
                    }
                }]
            };

            // Create PayPal payment  
            await paypal.payment.create(create_payment_json, function (error, payment) {
                if (error) {
                    console.error("Error creating PayPal payment:", error);
                    return res.status(500).json({ message: 'Error processing PayPal payment', error: error.message });
                } else {
                    // Assuming payerId is part of the payment response
                    const payerId = payment.payer.payer_id;

                    // Redirect user to paymentSuccess with payerId as a query parameter
                    const approvalUrl = payment.links.find(link => link.rel === 'approval_url').href;
                    const paymentSuccessUrl = `${approvalUrl}?payerId=${payerId}`;

                    return res.status(200).json({ approvalUrl: paymentSuccessUrl });
                }
            });


        } else if (paymentMethod === 'cod') {

            const order = new Order({
                userId: userId,
                ordersId: randomOrderId,
                deliveryAddress: address.toObject(),
                totalAmount: parseFloat(total),
                expectedDelivery: expectedDelivery,
                paymentMethod: paymentMethod,
                items: items.map((item) => ({
                    productId: item.productId._id,
                    quantity: item.quantity,
                    price: item.price,
                    total: item.price * item.quantity,
                })),
            });
            await order.save();
            console.log("Order placed successfully.")
            // Clear cart
            await CartItems.deleteMany({ user: userId });

            return res.status(200).json({
                status: true,
                orderId: order._id,
                message: 'Order placed successfully. Payment will be collected upon delivery.'
            });
        }

    } catch (error) {
        console.error('Error placing order:', error);
        res.status(500).json({ message: 'Error placing order', error: error.message });
    }
}

// For payment success
const paymentSuccess = async (req, res) => {
    try {
        const userId = req.session.user_id;
        const orderId = req.params.orderId;
        if (!orderId) {
            return res.status(400).json({ success: false, message: 'Order Id is missing.' });
        }

        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(400).json({ success: false, message: 'Order is not found.' });
        }
        order.status = 'paid';
       
        const paymentId = req.query.paymentId;
        const payerId = req.query.PayerID;
        order.paymentId = paymentId;

        // Check if payerId is provided
        if (payerId) {
            order.payerId = payerId;
        } else {
            console.log("payerId not provided");

        }

        await order.save();
        console.log("Paypal order Sucessfull.",);
        // Clear cart
        await CartItems.deleteMany({ user: userId });
        res.render('paymentSuccess', { req, orderId });

    } catch (error) {
        console.error('Error in payment success:', error);
        res.status(500).send('Server Error');
    }
};

// For payment cancellation
const paymentCancel = async (req, res) => {
    try {
        const orderId = req.params.orderId;

        if (!orderId) {
            return res.status(400).send('Order ID is missing.');
        }
        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).send('Order not found.');
        }
        order.status = 'retry';
        res.render('paymentCancel', { req, orderId });

    } catch (error) {
        console.error('Error in payment cancellation:', error);
        res.status(500).send('Server Error');
    }
};


//to show order deatils 
const orderDetails = async (req, res) => {
    try {
        const userId = req.params.id;

        const order = await Order.findById(userId).populate('userId').populate('items.productId');
        if (!order) {
            return res.status(404).send('Order not found');
        }
        res.render('orderDeatil', { req, order });
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
};

//this is for order confirmation
const orderConfirmation = async (req, res) => {
    try {
        const orderId = req.params.orderId;
        const order = await Order.findById(orderId).populate('userId').populate('items.productId');
        console.log("order",order)
        if (!order) {
            return res.status(404).send('Order not found');
        }
        res.render('orderConfirmation', { req, order });
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
};


//this is for oder cancellation
const cancelOrder = async (req, res) => {
    try {
        const { orderId, itemId } = req.params;

        const order = await Order.findById(orderId).populate('items.productId');

        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found.' });
        }

        const item = order.items.find(item => item._id.toString() === itemId);
        if (!item) {
            return res.status(404).json({ success: false, message: 'Item not found.' });
        }

        item.orderStatus = 'cancelled';

        await order.save();

        res.json({ success: true, message: 'Product cancelled successfully.' });
    } catch (error) {
        console.error('Error in /cancel/:orderId route:', error);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
};





module.exports = {
    checkout,
    placeOrder,
    orderDetails,
    orderConfirmation,
    cancelOrder,
    paymentSuccess,
    paymentCancel
}


