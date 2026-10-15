const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const app = express();
const port = Number(process.env.PORT || 4000);
const mealCategories = new Set(['Breakfast', 'Lunch', 'Dinner']);

app.use(cors({ origin: process.env.CORS_ORIGIN || true }));
app.use(express.json());
app.use(morgan('tiny'));

const integerId = (value) => {
  const id = Number(value);
  if (!Number.isInteger(id) || id < 1) throw new Error('Invalid id');
  return id;
};
const required = (body, fields) => {
  for (const field of fields) {
    if (body[field] === undefined || body[field] === null || body[field] === '') {
      const error = new Error(`${field} is required`);
      error.status = 400;
      throw error;
    }
  }
};
const validCategory = (value) => {
  if (!mealCategories.has(value)) {
    const error = new Error('category must be Breakfast, Lunch, or Dinner');
    error.status = 400;
    throw error;
  }
  return value;
};
const duplicateUserError = (fields) => {
  const error = new Error(`User Entry Exists! Duplicate: ${fields.join(', ')}`);
  error.status = 409;
  return error;
};
const dayStart = (value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const error = new Error('Date must use YYYY-MM-DD');
    error.status = 400;
    throw error;
  }
  return new Date(`${value}T00:00:00.000Z`);
};
const dayEnd = (value) => new Date(`${value}T23:59:59.999Z`);

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

app.get('/api/users', async (_req, res) => res.json(await prisma.user.findMany({ orderBy: { createdAt: 'desc' } })));
app.post('/api/users', async (req, res) => {
  required(req.body, ['name', 'email']);
  const email = req.body.email.trim().toLowerCase();
  const phone = typeof req.body.phone === 'string' ? req.body.phone.trim() : '';
  const matches = await prisma.user.findMany({
    where: { OR: [{ email }, ...(phone ? [{ phone }] : [])] },
    select: { email: true, phone: true },
  });
  const duplicateFields = [];
  if (matches.some((user) => user.email.toLowerCase() === email)) duplicateFields.push('Email');
  if (phone && matches.some((user) => user.phone === phone)) duplicateFields.push('Phone');
  if (duplicateFields.length > 0) throw duplicateUserError(duplicateFields);
  res.status(201).json(await prisma.user.create({ data: { ...req.body, email, phone: phone || null } }));
});
app.put('/api/users/:id', async (req, res) => res.json(await prisma.user.update({ where: { id: integerId(req.params.id) }, data: req.body })));
app.delete('/api/users/:id', async (req, res) => { await prisma.user.delete({ where: { id: integerId(req.params.id) } }); res.status(204).end(); });

app.get('/api/menu', async (_req, res) => res.json(await prisma.menuItem.findMany({ orderBy: { createdAt: 'desc' } })));
app.post('/api/menu', async (req, res) => {
  required(req.body, ['name', 'price', 'category']);
  res.status(201).json(await prisma.menuItem.create({ data: { ...req.body, category: validCategory(req.body.category), price: Number(req.body.price) } }));
});
app.put('/api/menu/:id', async (req, res) => res.json(await prisma.menuItem.update({ where: { id: integerId(req.params.id) }, data: { ...req.body, ...(req.body.category !== undefined && { category: validCategory(req.body.category) }), ...(req.body.price !== undefined && { price: Number(req.body.price) }) } })));
app.delete('/api/menu/:id', async (req, res) => { await prisma.menuItem.delete({ where: { id: integerId(req.params.id) } }); res.status(204).end(); });

const orderInclude = { user: true, menuItem: true };
app.get('/api/orders', async (_req, res) => res.json(await prisma.mealOrder.findMany({ include: orderInclude, orderBy: { orderDate: 'desc' } })));
app.post('/api/orders', async (req, res) => {
  required(req.body, ['userId', 'menuItemId', 'quantity', 'orderDate']);
  res.status(201).json(await prisma.mealOrder.create({ data: { ...req.body, orderDate: dayStart(req.body.orderDate), userId: integerId(req.body.userId), menuItemId: integerId(req.body.menuItemId), quantity: Number(req.body.quantity) }, include: orderInclude }));
});
app.put('/api/orders/:id', async (req, res) => res.json(await prisma.mealOrder.update({ where: { id: integerId(req.params.id) }, data: req.body, include: orderInclude })));
app.delete('/api/orders/:id', async (req, res) => { await prisma.mealOrder.delete({ where: { id: integerId(req.params.id) } }); res.status(204).end(); });

app.get('/api/bills/:userId', async (req, res) => {
  const { from, to } = req.query;
  required({ from, to }, ['from', 'to']);
  const fromDate = dayStart(from);
  const toDate = dayEnd(to);
  if (fromDate > toDate) {
    const error = new Error('The start date must be before the end date');
    error.status = 400;
    throw error;
  }
  const orders = await prisma.mealOrder.findMany({
    where: { userId: integerId(req.params.userId), orderDate: { gte: fromDate, lte: toDate } },
    include: orderInclude,
    orderBy: { orderDate: 'asc' },
  });
  const items = orders.map((order) => ({ ...order, unitPrice: Number(order.menuItem.price), lineTotal: Number(order.menuItem.price) * order.quantity }));
  res.json({ user: items[0]?.user || await prisma.user.findUnique({ where: { id: integerId(req.params.userId) } }), from, to, items, total: items.reduce((sum, item) => sum + item.lineTotal, 0) });
});

app.use((error, _req, res, _next) => {
  console.error(error);
  if (error.code === 'P2002') {
    return res.status(409).json({ error: 'User Entry Exists! Duplicate: Email' });
  }
  const status = error.status || (error.code === 'P2025' ? 404 : 500);
  res.status(status).json({ error: status === 500 ? 'Something went wrong' : error.message });
});

app.listen(port, () => console.log(`BJIT Meals API listening on port ${port}`));
