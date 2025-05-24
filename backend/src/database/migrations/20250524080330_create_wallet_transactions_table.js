/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('wallet_transactions', function (table) {
    table.uuid('transaction_id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('wallet_id').notNullable();
    table.uuid('user_id').notNullable();
    table.enum('type', ['DEBIT', 'CREDIT']).notNullable();
    table.decimal('amount', 10, 2).notNullable();
    table.decimal('balance_before', 10, 2);
    table.decimal('balance_after', 10, 2);
    table.string('description', 500);
    table.string('related_entity_type', 50);
    table.uuid('related_entity_id');
    table.timestamp('timestamp').defaultTo(knex.fn.now());
    
    // Foreign key constraints
    table.foreign('wallet_id').references('wallet_id').inTable('wallets').onDelete('CASCADE');
    table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');
    
    // Indexes
    table.index('wallet_id');
    table.index('user_id');
    table.index('timestamp');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTable('wallet_transactions');
};
