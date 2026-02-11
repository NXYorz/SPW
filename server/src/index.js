import 'dotenv/config';

import bcrypt from 'bcryptjs';
import cors from 'cors';
import express from 'express';
import { z } from 'zod';

import { signToken, authMiddleware, requireAdmin } from './auth.js';
import { resourceUpsertSchema } from './resources.js';

import { createPool } from './db.js';


const app = express();
const pool = createPool();

app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', async (req, res) => {
  const [rows] = await pool.query('select 1 as ok');
  res.json({ ok: true, db: rows[0].ok });
});


const registerSchema = z.object({
  username: z.string().min(2).max(32),
  password: z.string().min(6).max(72),
});

app.get('/api/users/me/days', authMiddleware, async (req, res) => {
  const userId = req.user.sub;
  const [rows] = await pool.query(
    'select datediff(now() , users.created_at) as day from users where id = ?',
    [userId]
  )
  const days = rows[0].day;
  res.json({ days });
});

app.post('/api/auth/register', async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'BAD_REQUEST', detail: parsed.error.flatten() });
    return;
  }

  const { username, password } = parsed.data;
  const normalized = username.trim().toLowerCase();

  const [exists] = await pool.query('select id from users where username = ?', [normalized]);
  if (exists.length) {
    res.status(409).json({ error: 'USERNAME_TAKEN' });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const [result] = await pool.query(
    'insert into users(username, password_hash, role,created_at) values (?, ?, ?,now())',
    [normalized, passwordHash, 'user'],
  );

  const [rows] = await pool.query('select id, username, role, created_at from users where id = ?', [result.insertId]);
  const user = rows[0];
  const token = signToken({ sub: user.id, username: user.username, role: user.role });
  res.json({ token, user });
});


const loginSchema = z.object({
  username: z.string().min(2).max(32),
  password: z.string().min(6).max(72),
});

app.post('/api/auth/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'BAD_REQUEST', detail: parsed.error.flatten() });
    return;
  }

  const { username, password } = parsed.data;
  const normalized = username.trim().toLowerCase();

  const [rows] = await pool.query('select id, username, role, password_hash, created_at from users where username = ?', [normalized]);
  if (!rows.length) {
    res.status(401).json({ error: 'INVALID_CREDENTIALS' });
    return;
  }

  const user = rows[0];
  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) {
    res.status(401).json({ error: 'INVALID_CREDENTIALS' });
    return;
  }

  const token = signToken({ sub: user.id, username: user.username, role: user.role });
  res.json({ token, user: { id: user.id, username: user.username, role: user.role, created_at: user.created_at } });
});

app.get('/api/auth/me', authMiddleware, async (req, res) => {
  const userId = req.user.sub;
  const [rows] = await pool.query('select id, username, role, created_at from users where id = ?', [userId]);
  if (!rows.length) {
    res.status(401).json({ error: 'UNAUTHORIZED' });
    return;
  }
  res.json({ user: rows[0] });
});


const planCreateSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  title: z.string().min(1).max(100),
  category: z.string().min(1).max(50),
  minutes: z.number().int().min(5).max(24 * 60),
  notes: z.string().max(400).optional(),
  public: z.boolean().optional(),
});

app.get('/api/plans', authMiddleware, async (req, res) => {
  const userId = req.user.sub;
  const date = typeof req.query.date === 'string' ? req.query.date : null;
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    res.status(400).json({ error: 'BAD_DATE' });
    return;
  }

  const [rows] = await pool.query(
    'select id, date, title, category, minutes, done, notes, public, created_at, updated_at from plans where user_id = ? and date = ? order by done asc, created_at desc',
    [userId, date],
  );
  res.json({ plans: rows });
});

app.get('/api/plans/month', authMiddleware, async (req, res) => {
  const userId = req.user.sub;
  const month = typeof req.query.month === 'string' ? req.query.month : null;
  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    res.status(400).json({ error: 'BAD_MONTH' });
    return;
  }

  const like = `${month}-%`;
  const [rows] = await pool.query(
    'select id, date, title, category, minutes, done, notes, public, created_at, updated_at from plans where user_id = ? and date like ? order by updated_at desc',
    [userId, like],
  );
  res.json({ plans: rows });
});


app.get('/api/plans/public', authMiddleware, async (req, res) => {
  const date = typeof req.query.date === 'string' ? req.query.date : null;
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    res.status(400).json({ error: 'BAD_DATE' });
    return;
  }

  const [rows] = await pool.query(
    `select p.id, p.date, p.title, p.category, p.minutes, p.done, p.notes, p.public, p.created_at, p.updated_at,
            u.username as owner
       from plans p
       join users u on u.id = p.user_id
      where p.date = ? and p.public = true
      order by p.updated_at desc
      limit 100`,
    [date],
  );

  res.json({ plans: rows });
});

app.post('/api/plans', authMiddleware, async (req, res) => {
  const userId = req.user.sub;
  const parsed = planCreateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'BAD_REQUEST', detail: parsed.error.flatten() });
    return;
  }

  const { date, title, category, minutes, notes, public: isPublic } = parsed.data;
  const [result] = await pool.query(
    `insert into plans(user_id, date, title, category, minutes, done, notes, public)
     values (?,?,?,?,?,false,?,?)`,
    [userId, date, title, category, minutes, notes ?? null, isPublic ?? false],
  );

  const [rows] = await pool.query('select * from plans where id = ?', [result.insertId]);
  res.json({ plan: rows[0] });
});


const planPatchSchema = z
  .object({
    title: z.string().min(1).max(100).optional(),
    category: z.string().min(1).max(50).optional(),
    minutes: z.number().int().min(5).max(24 * 60).optional(),
    done: z.boolean().optional(),
    notes: z.string().max(400).nullable().optional(),
    public: z.boolean().optional(),
  })
  .refine((v) => Object.keys(v).length > 0);

app.patch('/api/plans/:id', authMiddleware, async (req, res) => {
  const userId = req.user.sub;
  const planId = req.params.id;

  const parsed = planPatchSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'BAD_REQUEST', detail: parsed.error.flatten() });
    return;
  }

  const [owns] = await pool.query('select id from plans where id = ? and user_id = ?', [planId, userId]);
  if (!owns.length) {
    res.status(404).json({ error: 'NOT_FOUND' });
    return;
  }

  const fields = parsed.data;
  const keys = Object.keys(fields);
  const sets = keys.map((k) => `${k} = ?`);
  const values = keys.map((k) => fields[k]);

  const q = `update plans set ${sets.join(', ')} where id = ? and user_id = ?`;
  await pool.query(q, [...values, planId, userId]);
  const [rows] = await pool.query('select * from plans where id = ?', [planId]);
  res.json({ plan: rows[0] });
});

app.delete('/api/plans/:id', authMiddleware, async (req, res) => {
  const userId = req.user.sub;
  const planId = req.params.id;
  const [result] = await pool.query('delete from plans where id = ? and user_id = ?', [planId, userId]);
  if (!result.affectedRows) {
    res.status(404).json({ error: 'NOT_FOUND' });
    return;
  }
  res.json({ ok: true });
});

// Resources (public read, admin write)
app.get('/api/resources', async (req, res) => {

  const [rows] = await pool.query(
    'select id, title, category, type, url, summary, tags, created_at, updated_at from resources order by updated_at desc',
  );
  res.json({ resources: rows });
});

app.post('/api/resources', authMiddleware, requireAdmin, async (req, res) => {
  const parsed = resourceUpsertSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'BAD_REQUEST', detail: parsed.error.flatten() });
    return;
  }

  const { title, category, type, url, summary, tags } = parsed.data;
  const [result] = await pool.query(
    `insert into resources(title, category, type, url, summary, tags)
     values (?,?,?,?,?,?)`,
    [title, category, type, url, summary, JSON.stringify(tags)],
  );

  const [rows] = await pool.query('select * from resources where id = ?', [result.insertId]);
  res.json({ resource: rows[0] });
});

app.patch('/api/resources/:id', authMiddleware, requireAdmin, async (req, res) => {
  const resourceId = req.params.id;
  const parsed = resourceUpsertSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'BAD_REQUEST', detail: parsed.error.flatten() });
    return;
  }

  const { title, category, type, url, summary, tags } = parsed.data;
  const [result] = await pool.query(
    `update resources
        set title = ?,
            category = ?,
            type = ?,
            url = ?,
            summary = ?,
            tags = ?
      where id = ?`,
    [title, category, type, url, summary, JSON.stringify(tags), resourceId],
  );

  if (!result.affectedRows) {
    res.status(404).json({ error: 'NOT_FOUND' });
    return;
  }

  const [rows] = await pool.query('select * from resources where id = ?', [resourceId]);
  res.json({ resource: rows[0] });
});

app.delete('/api/resources/:id', authMiddleware, requireAdmin, async (req, res) => {
  const resourceId = req.params.id;
  const [result] = await pool.query('delete from resources where id = ?', [resourceId]);
  if (!result.affectedRows) {
    res.status(404).json({ error: 'NOT_FOUND' });
    return;
  }
  res.json({ ok: true });
});

// Update my password
const passwordUpdateSchema = z.object({
  oldPassword: z.string().min(1).max(72),
  newPassword: z.string().min(6).max(72),
});

app.patch('/api/users/me/password', authMiddleware, async (req, res) => {
  const userId = req.user.sub;
  const parsed = passwordUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'BAD_REQUEST', detail: parsed.error.flatten() });
    return;
  }

  const { oldPassword, newPassword } = parsed.data;

  const [rows] = await pool.query('select password_hash from users where id = ?', [userId]);
  if (!rows.length) {
    res.status(401).json({ error: 'UNAUTHORIZED' });
    return;
  }

  const ok = await bcrypt.compare(oldPassword, rows[0].password_hash);
  if (!ok) {
    res.status(401).json({ error: 'INVALID_CREDENTIALS' });
    return;
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await pool.query('update users set password_hash = ? where id = ?', [passwordHash, userId]);

  res.json({ ok: true });
});


const port = Number(process.env.PORT || 3000);
app.listen(port, () => {
  console.log(`api listening on :${port}`);
});

