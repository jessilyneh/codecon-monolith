// Product Routes
// Endpoints: /api/products

const express = require('express');
const router = express.Router();
const ProductService = require('../services/productService');

/**
 * GET /api/products
 * Get all products with optional filtering
 */
router.get('/', async (req, res) => {
  try {
    const filters = {
      category: req.query.category,
      minPrice: req.query.minPrice ? parseFloat(req.query.minPrice) : null,
      maxPrice: req.query.maxPrice ? parseFloat(req.query.maxPrice) : null,
      inStock: req.query.inStock === 'true',
      search: req.query.search,
      sortBy: req.query.sortBy || 'created_at',
      sortOrder: req.query.sortOrder || 'desc',
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 20
    };

    const products = await ProductService.getAllProducts(filters);
    res.status(200).json({ 
      count: products.length,
      products 
    });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/products/categories
 * Get all product categories
 */
router.get('/categories', async (req, res) => {
  try {
    const categories = await ProductService.getCategories();
    res.status(200).json({ categories });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/products/stats
 * Get product statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = await ProductService.getStatistics();
    res.status(200).json(stats);
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/products/low-stock
 * Get low stock products
 */
router.get('/low-stock', async (req, res) => {
  try {
    const threshold = parseInt(req.query.threshold) || 10;
    const products = await ProductService.getLowStockProducts(threshold);
    res.status(200).json({ 
      count: products.length,
      products 
    });
  } catch (error) {
    console.error('Get low stock products error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/products/:id
 * Get product by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const product = await ProductService.getProductById(req.params.id);
    res.status(200).json(product);
  } catch (error) {
    console.error('Get product error:', error);
    res.status(404).json({ error: error.message });
  }
});

/**
 * GET /api/products/category/:category
 * Get products by category
 */
router.get('/category/:category', async (req, res) => {
  try {
    const products = await ProductService.getProductsByCategory(req.params.category);
    res.status(200).json({ 
      category: req.params.category,
      count: products.length,
      products 
    });
  } catch (error) {
    console.error('Get products by category error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
