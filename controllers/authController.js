const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User } = require('../models');

const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, email: user.email },
    process.env.JWT_SECRET || 'supersecretjwtkeyforpersonalfinanceapp2026',
    { expiresIn: '7d' }
  );
};

exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Будь ласка, заповніть усі обов\'язкові поля' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Пароль має містити не менше 6 символів' });
    }

    // Перевірка наявності користувача
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: 'Користувач з таким email вже існує' });
    }

    // Хешування пароля
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    // Створення користувача
    const user = await User.create({
      name,
      email,
      password_hash
    });

    const token = generateToken(user);

    return res.status(201).json({
      message: 'Реєстрація успішна',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Помилка реєстрації:', error);
    return res.status(500).json({ message: 'Помилка на сервері при реєстрації користувача' });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Будь ласка, введіть email та пароль' });
    }

    // Пошук користувача
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(400).json({ message: 'Невірний email або пароль' });
    }

    // Перевірка пароля
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ message: 'Невірний email або пароль' });
    }

    const token = generateToken(user);

    return res.status(200).json({
      message: 'Вхід успішний',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Помилка входу:', error);
    return res.status(500).json({ message: 'Помилка на сервері при вході в систему' });
  }
};

exports.getProfile = async (req, res) => {
  try {
    const user = req.user;
    return res.status(200).json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Помилка отримання профілю:', error);
    return res.status(500).json({ message: 'Помилка на сервері при отриманні профілю' });
  }
};
