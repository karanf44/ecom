/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> } 
 */
exports.seed = async function(knex) {
  // Deletes ALL existing entries
  await knex('products').del();
  
  // Inserts seed entries
  await knex('products').insert([
    {
      id: knex.raw('uuid_generate_v4()'),
      name: 'Wireless Bluetooth Headphones',
      description: 'High-quality wireless headphones with noise cancellation and 30-hour battery life.',
      price: 199.99,
      image_url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500',
      category: 'Electronics',
      stock: 50
    },
    {
      id: knex.raw('uuid_generate_v4()'),
      name: 'Smartphone Case',
      description: 'Durable protective case for smartphones with shock absorption.',
      price: 29.99,
      image_url: 'https://images.unsplash.com/photo-1556656793-08538906a9f8?w=500',
      category: 'Electronics',
      stock: 100
    },
    {
      id: knex.raw('uuid_generate_v4()'),
      name: 'Coffee Mug',
      description: 'Ceramic coffee mug with ergonomic handle, perfect for your morning coffee.',
      price: 15.99,
      image_url: 'https://images.unsplash.com/photo-1514228742587-6b1558fcf93a?w=500',
      category: 'Home & Kitchen',
      stock: 75
    },
    {
      id: knex.raw('uuid_generate_v4()'),
      name: 'Running Shoes',
      description: 'Lightweight running shoes with advanced cushioning technology.',
      price: 129.99,
      image_url: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500',
      category: 'Sports',
      stock: 30
    },
    {
      id: knex.raw('uuid_generate_v4()'),
      name: 'Backpack',
      description: 'Spacious and durable backpack perfect for travel and daily use.',
      price: 79.99,
      image_url: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=500',
      category: 'Fashion',
      stock: 25
    },
    {
      id: knex.raw('uuid_generate_v4()'),
      name: 'Desk Lamp',
      description: 'Adjustable LED desk lamp with multiple brightness settings.',
      price: 45.99,
      image_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500',
      category: 'Home & Kitchen',
      stock: 40
    },
    {
      id: knex.raw('uuid_generate_v4()'),
      name: 'Yoga Mat',
      description: 'Non-slip yoga mat made from eco-friendly materials.',
      price: 39.99,
      image_url: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=500',
      category: 'Sports',
      stock: 60
    },
    {
      id: knex.raw('uuid_generate_v4()'),
      name: 'Wireless Mouse',
      description: 'Ergonomic wireless mouse with precision tracking.',
      price: 24.99,
      image_url: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=500',
      category: 'Electronics',
      stock: 80
    },
    {
      id: knex.raw('uuid_generate_v4()'),
      name: 'Water Bottle',
      description: 'Stainless steel water bottle that keeps drinks cold for 24 hours.',
      price: 22.99,
      image_url: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=500',
      category: 'Sports',
      stock: 90
    },
    {
      id: knex.raw('uuid_generate_v4()'),
      name: 'Notebook Set',
      description: 'Set of 3 premium notebooks with lined pages.',
      price: 18.99,
      image_url: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=500',
      category: 'Office',
      stock: 120
    }
  ]);
};
