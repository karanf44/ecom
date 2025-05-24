/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('products', function (table) {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.string('name', 255).notNullable();
    table.text('description');
    table.decimal('price', 10, 2).notNullable();
    table.string('image_url', 500);
    table.string('category', 100);
    table.integer('stock').defaultTo(0);
    table.timestamps(true, true); // created_at, updated_at
    
    // Performance indexes
    table.index('category');
    table.index('created_at'); // For sorting by date
    table.index('price'); // For price filtering/sorting
    table.index('stock'); // For stock availability checks
    
    // Composite indexes for common query patterns
    table.index(['category', 'created_at']); // Category + date sorting
    table.index(['category', 'price']); // Category + price filtering
    
    // Text search indexes (if using PostgreSQL)
    table.index(knex.raw('to_tsvector(\'english\', name || \' \' || COALESCE(description, \'\'))')); // Full-text search
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTable('products');
};
