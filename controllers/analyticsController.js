const { Transaction, Category, sequelize } = require('../models');
const { Op } = require('sequelize');

exports.getSummary = async (req, res) => {
  try {
    const userId = req.user.id;
    const { startDate, endDate } = req.query;

    const whereCondition = { userId };

    if (startDate && endDate) {
      whereCondition.date = {
        [Op.between]: [startDate, endDate]
      };
    }

    const totals = await Transaction.findAll({
      where: whereCondition,
      attributes: [
        'type',
        [sequelize.fn('SUM', sequelize.col('amount')), 'total']
      ],
      group: ['type']
    });

    let totalIncome = 0;
    let totalExpenses = 0;

    totals.forEach(t => {
      const type = t.getDataValue('type');
      const sum = parseFloat(t.getDataValue('total')) || 0;
      if (type === 'income') {
        totalIncome = sum;
      } else if (type === 'expense') {
        totalExpenses = sum;
      }
    });

    return res.status(200).json({
      totalIncome,
      totalExpenses,
      balance: totalIncome - totalExpenses
    });
  } catch (error) {
    console.error('Помилка отримання резюме аналітики:', error);
    return res.status(500).json({ message: 'Помилка на сервері при розрахунку балансу' });
  }
};

exports.getExpensesByCategory = async (req, res) => {
  try {
    const userId = req.user.id;
    const { startDate, endDate } = req.query;

    const whereCondition = {
      userId,
      type: 'expense'
    };

    if (startDate && endDate) {
      whereCondition.date = {
        [Op.between]: [startDate, endDate]
      };
    }

    const expenses = await Transaction.findAll({
      where: whereCondition,
      attributes: [
        'categoryId',
        [sequelize.fn('SUM', sequelize.col('amount')), 'total']
      ],
      include: [
        {
          model: Category,
          as: 'category',
          attributes: ['id', 'name', 'color', 'icon']
        }
      ],
      group: ['categoryId', 'category.id', 'category.name', 'category.color', 'category.icon']
    });

    const formattedExpenses = expenses.map(e => {
      const category = e.category;
      return {
        categoryId: e.categoryId,
        categoryName: category ? category.name : 'Інше',
        color: category ? category.color : '#64748b',
        icon: category ? category.icon : 'HelpCircle',
        total: parseFloat(e.getDataValue('total')) || 0
      };
    }).sort((a, b) => b.total - a.total);

    return res.status(200).json(formattedExpenses);
  } catch (error) {
    console.error('Помилка аналітики за категоріями:', error);
    return res.status(500).json({ message: 'Помилка на сервері при аналізі категорій витрат' });
  }
};

exports.getMonthlyTrend = async (req, res) => {
  try {
    const userId = req.user.id;
    // За замовчуванням беремо останні 6 місяців
    const { months = 6 } = req.query;

    const limitDate = new Date();
    limitDate.setMonth(limitDate.getMonth() - parseInt(months) + 1);
    limitDate.setDate(1); // Початок місяця

    const transactions = await Transaction.findAll({
      where: {
        userId,
        date: {
          [Op.gte]: limitDate.toISOString().slice(0, 10)
        }
      },
      attributes: ['amount', 'type', 'date'],
      order: [['date', 'ASC']]
    });

    // Групуємо транзакції по місяцях в коді (діалект-незалежно)
    const trendMap = {};

    // Ініціалізуємо місяці в тренді, щоб показати навіть місяці з нульовими транзакціями
    for (let i = 0; i < parseInt(months); i++) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const label = d.toLocaleString('uk-UA', { month: 'long', year: 'numeric' });
      const key = d.toISOString().slice(0, 7); // YYYY-MM
      trendMap[key] = {
        label,
        income: 0,
        expense: 0
      };
    }

    transactions.forEach(t => {
      const dateStr = t.date; // YYYY-MM-DD
      const key = dateStr.slice(0, 7); // YYYY-MM
      const type = t.type;
      const amount = parseFloat(t.amount) || 0;

      if (trendMap[key]) {
        if (type === 'income') {
          trendMap[key].income += amount;
        } else if (type === 'expense') {
          trendMap[key].expense += amount;
        }
      }
    });

    // Перетворюємо в масив та сортуємо по даті (старіші спочатку)
    const trendData = Object.keys(trendMap)
      .map(key => ({
        key,
        ...trendMap[key],
        income: parseFloat(trendMap[key].income.toFixed(2)),
        expense: parseFloat(trendMap[key].expense.toFixed(2))
      }))
      .sort((a, b) => a.key.localeCompare(b.key));

    return res.status(200).json(trendData);
  } catch (error) {
    console.error('Помилка отримання місячного тренду:', error);
    return res.status(500).json({ message: 'Помилка на сервері при аналізі трендів витрат' });
  }
};
