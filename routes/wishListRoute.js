const express = require("express");
const wishListRoute=express();
const wishListController=require('../controllers/wishListController');
wishListRoute.set('view engine','ejs');
wishListRoute.set('views','./views/user');
const userAuth=require('../middleware/userAuth');



wishListRoute.get('/',wishListController.loadWishlist)

wishListRoute.post('/addToWishList/:productId',userAuth.isLogin,wishListController.addToWishList)

wishListRoute.delete('/removeFromWishList/:productId',userAuth.isLogin,wishListController.RemoveFromWishList)

wishListRoute.delete('/clear',userAuth.isLogin,wishListController.clearWishList)


module.exports = wishListRoute;