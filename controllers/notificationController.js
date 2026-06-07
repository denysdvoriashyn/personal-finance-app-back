const { Notification } = require('../models');

exports.getNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const notifications = await Notification.findAll({
      where: { userId },
      order: [['createdAt', 'DESC']],
      limit: 30 // Обмежуємо останніми 30 сповіщеннями
    });

    return res.status(200).json(notifications);
  } catch (error) {
    console.error('Помилка отримання сповіщень:', error);
    return res.status(500).json({ message: 'Помилка на сервері при отриманні сповіщень' });
  }
};

exports.markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const notification = await Notification.findByPk(id);
    if (!notification) {
      return res.status(404).json({ message: 'Сповіщення не знайдено' });
    }

    if (notification.userId !== userId) {
      return res.status(403).json({ message: 'Ви не маєте доступу до цього сповіщення' });
    }

    await notification.update({ is_read: true });

    return res.status(200).json({ message: 'Сповіщення позначено як прочитане', notification });
  } catch (error) {
    console.error('Помилка оновлення сповіщення:', error);
    return res.status(500).json({ message: 'Помилка на сервері при оновленні сповіщення' });
  }
};

exports.markAllAsRead = async (req, res) => {
  try {
    const userId = req.user.id;

    await Notification.update(
      { is_read: true },
      { where: { userId, is_read: false } }
    );

    return res.status(200).json({ message: 'Усі сповіщення позначено як прочитані' });
  } catch (error) {
    console.error('Помилка оновлення сповіщень:', error);
    return res.status(500).json({ message: 'Помилка на сервері при оновленні сповіщень' });
  }
};
