/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.alterTable('users', function (table) {
    // Profile image columns
    table.string('profile_image_url', 500);
    table.string('profile_image_key', 200); // S3 key for deletion
    table.string('profile_thumbnail_url', 500);
    table.string('profile_thumbnail_key', 200);
    
    // Image metadata
    table.integer('profile_image_size');
    table.integer('profile_image_optimized_size');
    table.integer('profile_image_compression_ratio');
    
    // Indexes for performance
    table.index('profile_image_url');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.alterTable('users', function (table) {
    table.dropColumn('profile_image_url');
    table.dropColumn('profile_image_key');
    table.dropColumn('profile_thumbnail_url');
    table.dropColumn('profile_thumbnail_key');
    table.dropColumn('profile_image_size');
    table.dropColumn('profile_image_optimized_size');
    table.dropColumn('profile_image_compression_ratio');
  });
}; 