
const mongoose = require('mongoose');

const orderSchema = mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    orderId: {
        type: String,
        required: true
    },
    deliveryAddress: {
        type: Object,
        required: true
    },
    totalAmount: {
        type: Number,
        default: 0,
        required: true 
    },
    date: {
        type: Date,
        default: Date.now
    },
    expectedDelivery: {
        type: String,
        required: true
    },
    paymentMethod: {
        type: String,
        required: true
    },
    paymentId: {
        type: String
    },
    payerId: {
        type: String
    },  
    items: [{
        productId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product',
            required: true
        },
        quantity: {
            type: Number,
            required: true
        },
        price: {
            type: Number,
            required: true
        },
        total: {
            type: Number,
            required: true
        },
        orderStatus: {
            type: String,
            default: "placed"
        },
        cancellationReason: {
            type: String
        },
    }],
    status: {
        type: String,
        enum: ['pending', "placed", 'paid', 'delivered', 'cancelled'],
        default: 'placed'
    }
}, { timestamps: true })

    module.exports = mongoose.model('Order', orderSchema);