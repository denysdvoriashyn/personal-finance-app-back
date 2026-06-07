const { Budget, Category, Transaction } = require('../models');
const { Op } = require('sequelize');

exports.getBudgets = async (req, res) => {
  try {
    const userId = req.user.id;
    const budgets = await Budget.findAll({
      where: { userId },
      include: [
        {
          model: Category,
          as: 'category',
          attributes: ['id', 'name', 'icon', 'color', 'type']
        }
      ],
      order: [['endDate', 'DESC'], ['createdAt', 'DESC']]
    });

    // Для кожного бюджету динамічно розраховуємо поточні витрати
    const budgetsWithSpent = await Promise.all(
      budgets.map(async (budget) => {
        const whereCondition = {
          userId,
          type: 'expense',
          date: {
            [Op.between]: [budget.startDate, budget.endDate]
          }
        };

        // Якщо категорія вказана, фільтруємо по ній, інакше рахуємо загальні витрати
        if (budget.categoryId) {
          whereCondition.categoryId = budget.categoryId;
        }

        const spent = await Transaction.sum('amount', {
          where: whereCondition
        }) || 0;

        return {
          id: budget.id,
          userId: budget.userId,
          categoryId: budget.categoryId,
          limit_amount: parseFloat(budget.limit_amount),
          period: budget.period,
          startDate: budget.startDate,
          endDate: budget.endDate,
          createdAt: budget.createdAt,
          category: budget.category,
          spent_amount: parseFloat(spent)
        };
      })
    );

    return res.status(200).json(budgetsWithSpent);
  } catch (error) {
    console.error('Помилка отримання бюджетів:', error);
    return res.status(500).json({ message: 'Помилка на сервері при отриманні списку бюджетів' });
  }
};

exports.createBudget = async (req, res) => {
  try {
    const { categoryId, limit_amount, period, startDate, endDate } = req.body;
    const userId = req.user.id;

    if (!limit_amount || !startDate || !endDate) {
      return res.status(400).json({ message: 'Будь ласка, вкажіть суму ліміту та дати дії' });
    }

    if (categoryId) {
      // Перевірка існування категорії
      const category = await Category.findByPk(categoryId);
      if (!category) {
        return res.status(404).json({ message: 'Категорію не знайдено' });
      }
    }

    // Створення
    const budget = await Budget.create({
      userId,
      categoryId: categoryId || null,
      limit_amount,
      period: period || 'monthly',
      startDate,
      endDate
    });

    const fullBudget = await Budget.findByPk(budget.id, {
      include: [{ model: Category, as: 'category' }]
    });

    return res.status(201).json({
      message: 'Бюджет успішно створено',
      budget: {
        ...fullBudget.toJSON(),
        limit_amount: parseFloat(fullBudget.limit_amount),
        spent_amount: 0
      }
    });
  } catch (error) {
    console.error('Помилка створення бюджету:', error);
    return res.status(500).json({ message: 'Помилка на сервері при створенні бюджету' });
  }
};

exports.updateBudget = async (req, res) => {
  try {
    const { id } = req.params;
    const { categoryId, limit_amount, period, startDate, endDate } = req.body;
    const userId = req.user.id;

    const budget = await Budget.findByPk(id);
    if (!budget) {
      return res.status(404).json({ message: 'Бюджет не знайдено' });
    }

    if (budget.userId !== userId) {
      return res.status(403).json({ message: 'Ви не маєте доступу до цього бюджету' });
    }

    // Оновлення
    await budget.update({
      categoryId: categoryId !== undefined ? (categoryId || null) : budget.categoryId,
      limit_amount: limit_amount !== undefined ? limit_amount : budget.limit_amount,
      period: period !== undefined ? period : budget.period,
      startDate: startDate !== undefined ? startDate : budget.startDate,
      endDate: endDate !== undefined ? endDate : budget.endDate
    });

    const updatedBudget = await Budget.findByPk(budget.id, {
      include: [{ model: Category, as: 'category' }]
    });

    // Розраховуємо витрати на льоту після оновлення
    const whereCondition = {
      userId,
      type: 'expense',
      date: {
        [Op.between]: [updatedBudget.startDate, updatedBudget.endDate]
      }
    };

    if (updatedBudget.categoryId) {
      whereCondition.categoryId = updatedBudget.categoryId;
    }

    const spent = await Transaction.sum('amount', {
      where: whereCondition
    }) || 0;

    return res.status(200).json({
      message: 'Бюджет успішно оновлено',
      budget: {
        ...updatedBudget.toJSON(),
        limit_amount: parseFloat(updatedBudget.limit_amount),
        spent_amount: parseFloat(spent)
      }
    });
  } catch (error) {
    console.error('Помилка оновлення бюджету:', error);
    return res.status(500).json({ message: 'Помилка на сервері при оновленні бюджету' });
  }
};

exports.deleteBudget = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const budget = await Budget.findByPk(id);
    if (!budget) {
      return res.status(404).json({ message: 'Бюджет не знайдено' });
    }

    if (budget.userId !== userId) {
      return res.status(403).json({ message: 'Ви не маєте доступу до цього бюджету' });
    }

    await budget.destroy();

    return res.status(200).json({ message: 'Бюджет успішно видалено' });
  } catch (error) {
    console.error('Помилка видалення бюджету:', error);
    return res.status(500).json({ message: 'Помилка на сервері при видаленні бюджету' });
  }
};
