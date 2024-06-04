const express = require("express");
const categoryRoute = express();
const categoryController = require("../controllers/categoryController");
const auth = require("../middleware/adminAuth");

categoryRoute.use(express.static('admin'));



categoryRoute.set('view engine', 'ejs');
categoryRoute.set('views', './views/admin');

categoryRoute.get('/addcategory', auth.isLogin, categoryController.loadAddCategory)

categoryRoute.post('/addcategory', auth.isLogin, categoryController.upload.single('categoryPhoto'), categoryController.addCategory);

categoryRoute.get('/listcategories', auth.isLogin, categoryController.loadListCategory);
categoryRoute.put('/listCategories/:categoryId', auth.isLogin, categoryController.listCategory);

categoryRoute.get('/editcategory/:categoryId', auth.isLogin, categoryController.loadEditCategory);
categoryRoute.put('/editcategory/:categoryId', auth.isLogin, categoryController.upload.single('categoryPhoto'),categoryController.editCategory);

categoryRoute.put('/unlistCategories/:categoryId', auth.isLogin, categoryController.unlistCategory);


categoryRoute.put('/:categoryId/addOffer', auth.isLogin, categoryController.addOffer);
categoryRoute.put('/removeOffer/:categoryId', auth.isLogin, categoryController.removeOffer);


module.exports = categoryRoute;