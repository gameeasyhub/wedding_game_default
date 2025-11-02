const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const LEADERBOARD_FILE = path.join(__dirname, 'leaderboard.json');

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Чтение лидерборда
const readLeaderboard = () => {
    if (!fs.existsSync(LEADERBOARD_FILE)) {
        return [];
    }
    try {
        const data = fs.readFileSync(LEADERBOARD_FILE, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        console.error("Ошибка чтения файла лидерборда:", error);
        return [];
    }
};

// Запись лидерборда
const writeLeaderboard = (data) => {
    try {
        fs.writeFileSync(LEADERBOARD_FILE, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error("Ошибка записи в файл лидерборда:", error);
    }
};

// API: Получить лидерборд
app.get('/api/leaderboard', (req, res) => {
    res.json(readLeaderboard());
});

// API: Добавить результат
app.post('/api/leaderboard', (req, res) => {
    const { name, score } = req.body;
    if (typeof name !== 'string' || typeof score !== 'number' || name.trim() === '') {
        return res.status(400).json({ message: 'Неверные данные' });
    }
    const leaderboard = readLeaderboard();
    leaderboard.push({ name: name.slice(0, 15), score });
    leaderboard.sort((a, b) => b.score - a.score);
    const updatedLeaderboard = leaderboard.slice(0, 10);
    writeLeaderboard(updatedLeaderboard);
    res.status(201).json({ message: 'Результат сохранен' });
});

app.listen(PORT, () => {
    console.log(`Сервер запущен на порту ${PORT}`);
});