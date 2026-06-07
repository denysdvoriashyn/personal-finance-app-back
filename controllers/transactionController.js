const { Transaction, Category, Budget, Notification } = require('../models');
const { Op } = require('sequelize');

// Допоміжна функція перевірки перевищення бюджету
const checkBudgetExceeded = async (userId, categoryId, transactionDate) => {
  try {
    const now = new Date();

    // 1. Перевірка бюджету по конкретній категорії
    if (categoryId) {
      const budget = await Budget.findOne({
        where: {
          userId,
          categoryId,
          startDate: { [Op.lte]: transactionDate },
          endDate: { [Op.gte]: transactionDate }
        },
        include: [{ model: Category, as: 'category' }]
      });

      if (budget) {
        const transactionsSum = await Transaction.sum('amount', {
          where: {
            userId,
            categoryId,
            type: 'expense',
            date: {
              [Op.between]: [budget.startDate, budget.endDate]
            }
          }
        }) || 0;

        if (parseFloat(transactionsSum) > parseFloat(budget.limit_amount)) {
          const diff = (parseFloat(transactionsSum) - parseFloat(budget.limit_amount)).toFixed(2);
          const categoryName = budget.category ? budget.category.name : 'Категорію';
          
          await Notification.create({
            userId,
            type: 'budget_exceeded',
            message: `Увага! Бюджет на категорію "${categoryName}" перевищено на ${diff} грн. Ліміт: ${budget.limit_amount} грн. Витрачено: ${parseFloat(transactionsSum).toFixed(2)} грн.`
          });
        }
      }
    }

    // 2. Перевірка загального бюджету (де categoryId: null)
    const totalBudget = await Budget.findOne({
      where: {
        userId,
        categoryId: null,
        startDate: { [Op.lte]: transactionDate },
        endDate: { [Op.gte]: transactionDate }
      }
    });

    if (totalBudget) {
      const totalExpenses = await Transaction.sum('amount', {
        where: {
          userId,
          type: 'expense',
          date: {
            [Op.between]: [totalBudget.startDate, totalBudget.endDate]
          }
        }
      }) || 0;

      if (parseFloat(totalExpenses) > parseFloat(totalBudget.limit_amount)) {
        const diff = (parseFloat(totalExpenses) - parseFloat(totalBudget.limit_amount)).toFixed(2);
        
        await Notification.create({
          userId,
          type: 'budget_exceeded',
          message: `Увага! Загальний ліміт витрат на період з ${totalBudget.startDate} по ${totalBudget.endDate} перевищено на ${diff} грн. Ліміт: ${totalBudget.limit_amount} грн. Витрачено: ${parseFloat(totalExpenses).toFixed(2)} грн.`
        });
      }
    }
  } catch (err) {
    console.error('Помилка перевірки лімітів бюджету:', err);
  }
};

exports.getTransactions = async (req, res) => {
  try {
    const userId = req.user.id;
    const { type, categoryId, startDate, endDate, search, limit = 50, offset = 0 } = req.query;

    const whereCondition = { userId };

    if (type) {
      whereCondition.type = type;
    }

    if (categoryId) {
      whereCondition.categoryId = categoryId;
    }

    if (startDate && endDate) {
      whereCondition.date = {
        [Op.between]: [startDate, endDate]
      };
    } else if (startDate) {
      whereCondition.date = {
        [Op.gte]: startDate
      };
    } else if (endDate) {
      whereCondition.date = {
        [Op.lte]: endDate
      };
    }

    if (search) {
      whereCondition.description = {
        [Op.iLike]: `%${search}%` // PostgreSQL iLike для регістронезалежного пошуку
      };
    }

    const { rows: transactions, count } = await Transaction.findAndCountAll({
      where: whereCondition,
      include: [
        {
          model: Category,
          as: 'category',
          attributes: ['id', 'name', 'icon', 'color', 'type']
        }
      ],
      order: [['date', 'DESC'], ['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    return res.status(200).json({
      transactions,
      count,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error('Помилка отримання транзакцій:', error);
    return res.status(500).json({ message: 'Помилка на сервері при отриманні списку транзакцій' });
  }
};

exports.createTransaction = async (req, res) => {
  try {
    const { amount, type, categoryId, date, description } = req.body;
    const userId = req.user.id;

    if (!amount || !type || !categoryId || !date) {
      return res.status(400).json({ message: 'Будь ласка, заповніть усі обов\'язкові поля' });
    }

    if (type !== 'income' && type !== 'expense') {
      return res.status(400).json({ message: 'Невірний тип транзакції' });
    }

    // Перевірка існування категорії
    const category = await Category.findByPk(categoryId);
    if (!category) {
      return res.status(404).json({ message: 'Категорію не знайдено' });
    }

    // Створення транзакції
    const transaction = await Transaction.create({
      userId,
      categoryId,
      amount,
      type,
      date,
      description
    });

    // Отримуємо повні дані про транзакцію разом з категорією для клієнта
    const fullTransaction = await Transaction.findByPk(transaction.id, {
      include: [{ model: Category, as: 'category' }]
    });

    // Перевірка бюджету
    if (type === 'expense') {
      await checkBudgetExceeded(userId, categoryId, date);
    }

    return res.status(201).json({
      message: 'Транзакцію успішно додано',
      transaction: fullTransaction
    });
  } catch (error) {
    console.error('Помилка створення транзакції:', error);
    return res.status(500).json({ message: 'Помилка на сервері при додаванні транзакції' });
  }
};

exports.updateTransaction = async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, type, categoryId, date, description } = req.body;
    const userId = req.user.id;

    const transaction = await Transaction.findByPk(id);
    if (!transaction) {
      return res.status(404).json({ message: 'Транзакцію не знайдено' });
    }

    if (transaction.userId !== userId) {
      return res.status(403).json({ message: 'Ви не маєте доступу до цієї транзакції' });
    }

    // Оновлення
    await transaction.update({
      amount: amount !== undefined ? amount : transaction.amount,
      type: type !== undefined ? type : transaction.type,
      categoryId: categoryId !== undefined ? categoryId : transaction.categoryId,
      date: date !== undefined ? date : transaction.date,
      description: description !== undefined ? description : transaction.description
    });

    const updatedTransaction = await Transaction.findByPk(transaction.id, {
      include: [{ model: Category, as: 'category' }]
    });

    // Перевірка бюджету після оновлення
    if (updatedTransaction.type === 'expense') {
      await checkBudgetExceeded(userId, updatedTransaction.categoryId, updatedTransaction.date);
    }

    return res.status(200).json({
      message: 'Транзакцію успішно оновлено',
      transaction: updatedTransaction
    });
  } catch (error) {
    console.error('Помилка оновлення транзакції:', error);
    return res.status(500).json({ message: 'Помилка на сервері при оновленні транзакції' });
  }
};

exports.deleteTransaction = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const transaction = await Transaction.findByPk(id);
    if (!transaction) {
      return res.status(404).json({ message: 'Транзакцію не знайдено' });
    }

    if (transaction.userId !== userId) {
      return res.status(403).json({ message: 'Ви не маєте доступу до цієї транзакції' });
    }

    await transaction.destroy();

    return res.status(200).json({ message: 'Транзакцію успішно видалено' });
  } catch (error) {
    console.error('Помилка видалення транзакції:', error);
    return res.status(500).json({ message: 'Помилка на сервері при видаленні транзакції' });
  }
};
