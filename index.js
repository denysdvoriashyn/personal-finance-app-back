require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { sequelize } = require('./models');

// Імпорт маршрутів
const authRoutes = require('./routes/authRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const transactionRoutes = require('./routes/transactionRoutes');
const budgetRoutes = require('./routes/budgetRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Мідлвари
app.use(cors({
  origin: '*', // Для простоти підключення локального фронтенду
  credentials: true
}));
app.use(express.json());

// Базовий роут для перевірки працездатності бекенду
app.get('/', (req, res) => {
  res.json({
    status: 'success',
    message: 'Бекенд веб-додатку для управління особистими фінансами працює!',
    environment: process.env.NODE_ENV || 'development'
  });
});

// Підключення маршрутів API
app.use('/api/auth', authRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/budgets', budgetRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/analytics', analyticsRoutes);

// Обробка неіснуючих маршрутів
app.use((req, res, next) => {
  res.status(404).json({ message: 'Ендпоінт не знайдено' });
});

// Глобальний обробник помилок
app.use((err, req, res, next) => {
  console.error('Неочікувана помилка:', err);
  res.status(500).json({ message: 'Сталася неочікувана помилка на сервері' });
});

// Перевірка з'єднання з БД та запуск сервера
const startServer = async () => {
  try {
    await sequelize.authenticate();
    console.log('З\'єднання з базою даних PostgreSQL успішно встановлено.');
    
    app.listen(PORT, () => {
      console.log(`Сервер бекенду запущено на порту ${PORT}`);
    });
  } catch (error) {
    console.error('Неможливо з\'єднатися з базою даних:', error);
    process.exit(1);
  }
};

startServer();
