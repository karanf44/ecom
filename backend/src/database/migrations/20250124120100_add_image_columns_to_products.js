/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.alterTable('products', function (table) {
    // Rename existing column for clarity
    table.renameColumn('image_url', 'primary_image_url');
    
    // Add S3 key for primary image
    table.string('primary_image_key', 200);
    
    // Thumbnail URLs
    table.string('thumbnail_small_url', 500);
    table.string('thumbnail_small_key', 200);
    table.string('thumbnail_medium_url', 500);
    table.string('thumbnail_medium_key', 200);
    table.string('thumbnail_large_url', 500);
    table.string('thumbnail_large_key', 200);
    
    // Image metadata
    table.integer('primary_image_size');
    table.integer('primary_image_optimized_size');
    table.integer('primary_image_compression_ratio');
    
    // User who created the product (for permissions)
    table.uuid('created_by');
    
    // Indexes
    table.index('primary_image_url');
    table.index('created_by');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.alterTable('products', function (table) {
    // Restore original column name
    table.renameColumn('primary_image_url', 'image_url');
    
    // Drop added columns
    table.dropColumn('primary_image_key');
    table.dropColumn('thumbnail_small_url');
    table.dropColumn('thumbnail_small_key');
    table.dropColumn('thumbnail_medium_url');
    table.dropColumn('thumbnail_medium_key');
    table.dropColumn('thumbnail_large_url');
    table.dropColumn('thumbnail_large_key');
    table.dropColumn('primary_image_size');
    table.dropColumn('primary_image_optimized_size');
    table.dropColumn('primary_image_compression_ratio');
    table.dropColumn('created_by');
  });
}; 