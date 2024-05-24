const express = require("express");
const app = express();
require("dotenv").config();
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const session = require("express-session");
const passport = require('passport'); 
const { configurePayPal } = require('./config/paypalConfig');


// Connect to MongoDB using Mongoose
mongoose.connect(process.env.MONGODB_URL);

//connection  of local host
const port = parseInt(process.env.PORT) || 6969;

//for session
app.use(session({
  secret: process.env.SESSION_SECRET,
  name: process.env.SESSION_NAME,
  resave: false,
  saveUninitialized:true,

}));

// Configure PayPal
configurePayPal();

// Initialize passport and its session handling
app.use(passport.initialize());
app.use(passport.session());

app.use((req, res, next) => {
  res.set('Cache-control', 'no-store,no-cache');
  next();
});





app.use(express.json());
app.use(express.urlencoded({ extended: true }));


//for user route
const userRoute = require('./routes/userRoute')

//for admin route
const adminRoute = require('./routes/adminRoute')

//for category route
const categoryRoute=require('./routes/categoryRoute')

//for product route
const productRoute=require('./routes/productRoute')

//for cart route
const cartRoute=require('./routes/cartRoute')

//for order route
const orderRoute=require('./routes/orderRoute')

//for admin order list
 const orderListRoute = require('./routes/orderListRoute')

//for wishlist route
const wishListRoute=require('./routes/wishListRoute')

//for dashboard route
const dashboardRoute=require('./routes/dashboardRoute')

//for coupon route
const couponRoute=require('./routes/couponRoute')

//for coupon route
const offerRoute=require('./routes/offerRoute')




app.use('/admin', express.static('adminAssets'));
app.use('/uploads', express.static('uploads'));
app.use(express.static('assets'));
app.use(cookieParser());




app.use('/', userRoute)
app.use('/admin',adminRoute)
app.use('/admin/category',categoryRoute)
app.use('/admin/product',productRoute)
app.use('/cart',cartRoute)
app.use('/order',orderRoute)
app.use('/admin/orderList',orderListRoute)
app.use('/wishList',wishListRoute)
app.use('/dashboard',dashboardRoute)
app.use('/admin/coupon',couponRoute)
app.use('/admin/offer',offerRoute)



app.listen(port, () => {
  console.log(`Sever Running on port number http://localhost:${port}`);
  console.log(`Sever Running on port number http://localhost:${port}/admin/`);
});

