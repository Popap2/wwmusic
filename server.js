const express = require('express');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const PORT = 3000;

// чтобы читать JSON из fetch
app.use(express.json());

// раздаём статику (твой html, css, js)
app.use(express.static(__dirname));

// ==== БАЗА ДАННЫХ SQLite ====
const db = new sqlite3.Database(path.join(__dirname, 'music.db'));

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS tracks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      owner_id INTEGER,
      title TEXT NOT NULL,
      artist TEXT,
      url TEXT NOT NULL
    )
  `);
});

// ==== API ДЛЯ АККАУНТОВ ====

// регистрация
app.post('/api/register', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'email и пароль обязательны' });

  db.run(
    'INSERT INTO users (email, password) VALUES (?, ?)',
    [email.toLowerCase(), password],
    function (err) {
      if (err) {
        if (err.code === 'SQLITE_CONSTRAINT') {
          return res.status(409).json({ error: 'Пользователь уже есть' });
        }
        return res.status(500).json({ error: 'Ошибка БД' });
      }
      res.json({ id: this.lastID, email });
    }
  );
});

// вход
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  db.get(
    'SELECT id, email FROM users WHERE email = ? AND password = ?',
    [email.toLowerCase(), password],
    (err, row) => {
      if (err) return res.status(500).json({ error: 'Ошибка БД' });
      if (!row) return res.status(401).json({ error: 'Неверный email или пароль' });
      res.json(row); // {id, email}
    }
  );
});

// ==== API ДЛЯ ТРЕКОВ ====
// пока только метаданные; url — это ссылка или путь к файлу, который ты сам решил
app.post('/api/tracks', (req, res) => {
  const { ownerId, title, artist, url } = req.body;
  if (!title || !url) return res.status(400).json({ error: 'title и url обязательны' });

  db.run(
    'INSERT INTO tracks (owner_id, title, artist, url) VALUES (?,?,?,?)',
    [ownerId || null, title, artist || null, url],
    function (err) {
      if (err) return res.status(500).json({ error: 'Ошибка БД' });
      res.json({ id: this.lastID, title, artist, url });
    }
  );
});

// получить все треки
app.get('/api/tracks', (req, res) => {
  db.all('SELECT id, title, artist, url FROM tracks', (err, rows) => {
    if (err) return res.status(500).json({ error: 'Ошибка БД' });
    res.json(rows);
  });
});

// главная страница
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'Музыка 3.html'));
});

app.listen(PORT, () => {
  console.log('Server running on http://localhost:' + PORT);
});