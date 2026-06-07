require('dotenv').config();
const bcrypt = require('bcryptjs');
const { User, Category, Transaction, Budget, Notification } = require('../models');

const seedDemoData = async () => {
  try {
    console.log('Початок генерації демонстраційних даних...');

    // 1. Пошук або створення демо-користувача
    const email = 'demo@example.com';
    let user = await User.findOne({ where: { email } });
    
    if (user) {
      console.log('Демо-користувач вже існує. Очищення його старих даних...');
      // Очищаємо транзакції, бюджети та сповіщення цього користувача
      await Transaction.destroy({ where: { userId: user.id } });
      await Budget.destroy({ where: { userId: user.id } });
      await Notification.destroy({ where: { userId: user.id } });
    } else {
      console.log('Створення демо-користувача...');
      const salt = await bcrypt.genSalt(10);
      const password_hash = await bcrypt.hash('password123', salt);
      user = await User.create({
        name: 'Олександр Фінансист',
        email,
        password_hash
      });
    }

    // 2. Системні категорії (повинні бути вже створені сідерном)
    // Якщо сідер не запускали, перевіримо їх наявність
    const categories = await Category.findAll({ where: { userId: null } });
    if (categories.length === 0) {
      console.error('Попередження: Системні категорії не знайдені в БД. Будь ласка, запустіть sequelize db:seed:all спочатку!');
      process.exit(1);
    }

    const catMap = {};
    categories.forEach(c => {
      catMap[c.name] = c.id;
    });

    console.log('Категорії для прив\'язки:', Object.keys(catMap));

    // 3. Генерація транзакцій за останні 6 місяців
    const transactionsToInsert = [];
    const now = new Date();
    
    // Створимо масив останніх 6 місяців
    for (let m = 5; m >= 0; m--) {
      const targetMonth = new Date();
      targetMonth.setMonth(now.getMonth() - m);
      const year = targetMonth.getFullYear();
      const month = targetMonth.getMonth(); // 0-11

      // Дати для генерації
      const dateStr = (day) => `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

      // --- ДОХОДИ ---
      // Зарплата (кожен місяць 5-го числа)
      transactionsToInsert.push({
        userId: user.id,
        categoryId: catMap['Зарплата'],
        amount: 32000.00,
        type: 'income',
        date: dateStr(5),
        description: 'Заробітна плата'
      });

      // Фріланс (середина місяця, випадково)
      if (Math.random() > 0.3) {
        transactionsToInsert.push({
          userId: user.id,
          categoryId: catMap['Фріланс'],
          amount: parseFloat((4000 + Math.random() * 8000).toFixed(2)),
          type: 'income',
          date: dateStr(18),
          description: 'Проект розробки веб-сайту'
        });
      }

      // --- ВИТРАТИ ---
      // Оренда житла (кожен місяць 2-го числа)
      transactionsToInsert.push({
        userId: user.id,
        categoryId: catMap['Житло'],
        amount: 12000.00,
        type: 'expense',
        date: dateStr(2),
        description: 'Оренда квартири + комунальні послуги'
      });

      // Продукти (регулярно, 8-10 разів на місяць по 400-1200 грн)
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const groceryDays = [3, 6, 9, 12, 15, 18, 21, 24, 27, 29].filter(day => day <= daysInMonth);
      groceryDays.forEach(day => {
        const amt = parseFloat((300 + Math.random() * 900).toFixed(2));
        transactionsToInsert.push({
          userId: user.id,
          categoryId: catMap['Продукти'],
          amount: amt,
          type: 'expense',
          date: dateStr(day),
          description: 'Покупка продуктів у супермаркеті'
        });
      });

      // Транспорт (5-6 разів на місяць по 100-350 грн + проїзний)
      transactionsToInsert.push({
        userId: user.id,
        categoryId: catMap['Транспорт'],
        amount: 500.00,
        type: 'expense',
        date: dateStr(1),
        description: 'Місячний проїзний на метро/автобус'
      });

      const transportDays = [7, 14, 22, 28];
      transportDays.forEach(day => {
        const amt = parseFloat((150 + Math.random() * 250).toFixed(2));
        transactionsToInsert.push({
          userId: user.id,
          categoryId: catMap['Транспорт'],
          amount: amt,
          type: 'expense',
          date: dateStr(day),
          description: 'Поїздка на таксі'
        });
      });

      // Кафе та ресторани (щотижня)
      const cafeDays = [4, 11, 19, 25];
      cafeDays.forEach(day => {
        const amt = parseFloat((250 + Math.random() * 600).toFixed(2));
        transactionsToInsert.push({
          userId: user.id,
          categoryId: catMap['Кафе та ресторани'],
          amount: amt,
          type: 'expense',
          date: dateStr(day),
          description: 'Вечеря в ресторані / кава з друзями'
        });
      });

      // Розваги (кіно, боулінг тощо, 2 рази на місяць)
      transactionsToInsert.push({
        userId: user.id,
        categoryId: catMap['Розваги'],
        amount: 800.00,
        type: 'expense',
        date: dateStr(10),
        description: 'Квитки в кіно та попкорн'
      });

      if (Math.random() > 0.5) {
        transactionsToInsert.push({
          userId: user.id,
          categoryId: catMap['Розваги'],
          amount: 1500.00,
          type: 'expense',
          date: dateStr(23),
          description: 'Концерт улюбленого гурту'
        });
      }

      // Здоров'я (аптека, раз на 2 місяці)
      if (m % 2 === 0) {
        transactionsToInsert.push({
          userId: user.id,
          categoryId: catMap['Здоров\'я'],
          amount: 650.00,
          type: 'expense',
          date: dateStr(15),
          description: 'Вітаміни та ліки'
        });
      }
    }

    console.log(`Генерація ${transactionsToInsert.length} транзакцій для вставки...`);
    await Transaction.bulkCreate(transactionsToInsert);

    // 4. Встановлення лімітів бюджету на поточний місяць
    console.log('Встановлення демонстраційних бюджетних лімітів...');
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    const endOfMonth = new Date(startOfMonth.getFullYear(), startOfMonth.getMonth() + 1, 0);

    const startStr = startOfMonth.toISOString().slice(0, 10);
    const endStr = endOfMonth.toISOString().slice(0, 10);

    // Ліміт на продукти (достатній)
    await Budget.create({
      userId: user.id,
      categoryId: catMap['Продукти'],
      limit_amount: 8500.00,
      period: 'monthly',
      startDate: startStr,
      endDate: endStr
    });

    // Ліміт на кафе (який буде перевищено для наочності сповіщення)
    await Budget.create({
      userId: user.id,
      categoryId: catMap['Кафе та ресторани'],
      limit_amount: 1200.00, // Малий ліміт, щоб продемонструвати перевищення
      period: 'monthly',
      startDate: startStr,
      endDate: endStr
    });

    // 5. Генерація демонстраційного сповіщення про перевищення бюджету
    console.log('Створення тестового сповіщення про перевищення...');
    await Notification.create({
      userId: user.id,
      type: 'budget_exceeded',
      message: `Увага! Бюджет на категорію "Кафе та ресторани" перевищено на 380.00 грн. Ліміт: 1200.00 грн. Витрачено: 1580.00 грн.`
    });

    console.log('========================================================');
    console.log(' Демонстраційні дані успішно згенеровані!');
    console.log(` Електронна пошта для входу: ${email}`);
    console.log(' Пароль для входу: password123');
    console.log('========================================================');
    process.exit(0);

  } catch (error) {
    console.error('Помилка генерації демо-даних:', error);
    process.exit(1);
  }
};

seedDemoData();
