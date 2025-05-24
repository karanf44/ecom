/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.alterTable('products', function (table) {
    // Add performance indexes if they don't exist
    table.index('created_at', 'idx_products_created_at');
    table.index('price', 'idx_products_price');
    table.index('stock', 'idx_products_stock');
    
    // Composite indexes for common query patterns
    table.index(['category', 'created_at'], 'idx_products_category_created_at');
    table.index(['category', 'price'], 'idx_products_category_price');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.alterTable('products', function (table) {
    table.dropIndex('created_at', 'idx_products_created_at');
    table.dropIndex('price', 'idx_products_price');
    table.dropIndex('stock', 'idx_products_stock');
    table.dropIndex(['category', 'created_at'], 'idx_products_category_created_at');
    table.dropIndex(['category', 'price'], 'idx_products_category_price');
  });
}; 