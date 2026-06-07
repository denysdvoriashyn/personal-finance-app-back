const { Category } = require('../models');
const { Op } = require('sequelize');

exports.getCategories = async (req, res) => {
  try {
    const userId = req.user.id;
    // Отримуємо глобальні категорії (userId: null) + власні категорії користувача
    const categories = await Category.findAll({
      where: {
        [Op.or]: [
          { userId: null },
          { userId }
        ]
      },
      order: [['name', 'ASC']]
    });

    return res.status(200).json(categories);
  } catch (error) {
    console.error('Помилка отримання категорій:', error);
    return res.status(500).json({ message: 'Помилка на сервері при отриманні категорій' });
  }
};

exports.createCategory = async (req, res) => {
  try {
    const { name, type, icon, color } = req.body;
    const userId = req.user.id;

    if (!name || !type || !icon || !color) {
      return res.status(400).json({ message: 'Будь ласка, заповніть усі поля' });
    }

    if (type !== 'income' && type !== 'expense') {
      return res.status(400).json({ message: 'Невірний тип категорії (має бути income або expense)' });
    }

    // Створення власної категорії
    const category = await Category.create({
      userId,
      name,
      type,
      icon,
      color
    });

    return res.status(201).json({
      message: 'Категорію успішно створено',
      category
    });
  } catch (error) {
    console.error('Помилка створення категорії:', error);
    return res.status(500).json({ message: 'Помилка на сервері при створенні категорії' });
  }
};

exports.deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const category = await Category.findByPk(id);
    if (!category) {
      return res.status(404).json({ message: 'Категорію не знайдено' });
    }

    // Перевірка прав (не можна видаляти системні категорії та категорії інших користувачів)
    if (category.userId === null) {
      return res.status(403).json({ message: 'Не можна видаляти системні категорії' });
    }

    if (category.userId !== userId) {
      return res.status(403).json({ message: 'Ви не маєте доступу до цієї категорії' });
    }

    await category.destroy();

    return res.status(200).json({ message: 'Категорію успішно видалено' });
  } catch (error) {
    console.error('Помилка видалення категорії:', error);
    return res.status(500).json({ message: 'Помилка на сервері при видаленні категорії' });
  }
};
