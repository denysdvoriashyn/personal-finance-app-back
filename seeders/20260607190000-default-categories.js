'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const now = new Date();
    await queryInterface.bulkInsert('Categories', [
      {
        id: '3e8e7a2b-2e9b-4bfa-8e31-40e1e2d46e10',
        userId: null,
        name: 'Продукти',
        type: 'expense',
        icon: 'ShoppingBag',
        color: '#e11d48',
        createdAt: now,
        updatedAt: now
      },
      {
        id: '3e8e7a2b-2e9b-4bfa-8e31-40e1e2d46e11',
        userId: null,
        name: 'Транспорт',
        type: 'expense',
        icon: 'Car',
        color: '#3b82f6',
        createdAt: now,
        updatedAt: now
      },
      {
        id: '3e8e7a2b-2e9b-4bfa-8e31-40e1e2d46e12',
        userId: null,
        name: 'Житло',
        type: 'expense',
        icon: 'Home',
        color: '#ca8a04',
        createdAt: now,
        updatedAt: now
      },
      {
        id: '3e8e7a2b-2e9b-4bfa-8e31-40e1e2d46e13',
        userId: null,
        name: 'Розваги',
        type: 'expense',
        icon: 'Film',
        color: '#8b5cf6',
        createdAt: now,
        updatedAt: now
      },
      {
        id: '3e8e7a2b-2e9b-4bfa-8e31-40e1e2d46e14',
        userId: null,
        name: 'Здоров\'я',
        type: 'expense',
        icon: 'HeartPulse',
        color: '#10b981',
        createdAt: now,
        updatedAt: now
      },
      {
        id: '3e8e7a2b-2e9b-4bfa-8e31-40e1e2d46e15',
        userId: null,
        name: 'Кафе та ресторани',
        type: 'expense',
        icon: 'Utensils',
        color: '#f97316',
        createdAt: now,
        updatedAt: now
      },
      {
        id: '3e8e7a2b-2e9b-4bfa-8e31-40e1e2d46e16',
        userId: null,
        name: 'Зарплата',
        type: 'income',
        icon: 'Briefcase',
        color: '#059669',
        createdAt: now,
        updatedAt: now
      },
      {
        id: '3e8e7a2b-2e9b-4bfa-8e31-40e1e2d46e17',
        userId: null,
        name: 'Фріланс',
        type: 'income',
        icon: 'Laptop',
        color: '#06b6d4',
        createdAt: now,
        updatedAt: now
      },
      {
        id: '3e8e7a2b-2e9b-4bfa-8e31-40e1e2d46e18',
        userId: null,
        name: 'Інші доходи',
        type: 'income',
        icon: 'Coins',
        color: '#64748b',
        createdAt: now,
        updatedAt: now
      }
    ], {});
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('Categories', {
      userId: null
    }, {});
  }
};
