import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { api } from './api';
import './styles.css';

const emptyUser = { name: '', email: '', phone: '', address: '' };
const mealCategories = ['Breakfast', 'Lunch', 'Dinner'];
const emptyMenu = { name: '', description: '', price: '', category: 'Lunch' };
const today = new Date().toISOString().slice(0, 10);
const monthStart = `${today.slice(0, 8)}01`;

function App() {
  const [tab, setTab] = useState('orders');
  const [users, setUsers] = useState([]);
  const [menu, setMenu] = useState([]);
  const [orders, setOrders] = useState([]);
  const [userForm, setUserForm] = useState(emptyUser);
  const [menuForm, setMenuForm] = useState(emptyMenu);
  const [orderForm, setOrderForm] = useState({ userId: '', menuItemId: '', quantity: 1, orderDate: today, notes: '' });
  const [billFilter, setBillFilter] = useState({ userId: '', from: monthStart, to: today });
  const [bill, setBill] = useState(null);
  const [notice, setNotice] = useState('');

  const load = async () => {
    try { const [nextUsers, nextMenu, nextOrders] = await Promise.all([api.users(), api.menu(), api.orders()]); setUsers(nextUsers); setMenu(nextMenu); setOrders(nextOrders); }
    catch (error) { setNotice(error.message); }
  };
  useEffect(() => { load(); }, []);
  const run = async (action) => { try { await action(); await load(); setNotice('Saved successfully'); } catch (error) { setNotice(error.message); } };

  return <div className="app-shell">
    <header className="topbar"><div className="brand"><span className="brand-mark">B</span><div><strong>BJIT Meals</strong><small>Kitchen operations</small></div></div><div className="status"><i /> API connected</div></header>
    <main>
      <section className="intro"><h1>BJIT Meals</h1><div className="date-chip">{new Intl.DateTimeFormat('en', { dateStyle: 'full' }).format(new Date())}</div></section>
      <nav className="tabs">{[['orders', 'Orders', orders.length], ['bills', 'Bills', '৳'], ['menu', 'Menu', menu.length], ['users', 'People', users.length]].map(([key, label, count]) => <button className={tab === key ? 'active' : ''} onClick={() => setTab(key)} key={key}>{label}<span>{count}</span></button>)}</nav>
      {notice && <div className="notice" onClick={() => setNotice('')}>{notice} <b>×</b></div>}
      {tab === 'orders' && <Orders orders={orders} users={users} menu={menu} form={orderForm} setForm={setOrderForm} run={run} />}
      {tab === 'bills' && <Bills users={users} filter={billFilter} setFilter={setBillFilter} bill={bill} setBill={setBill} run={run} />}
      {tab === 'menu' && <Menu menu={menu} form={menuForm} setForm={setMenuForm} run={run} />}
      {tab === 'users' && <Users users={users} form={userForm} setForm={setUserForm} run={run} />}
    </main>
  </div>;
}

function Orders({ orders, users, menu, form, setForm, run }) {
  return <div className="workspace"><section className="panel form-panel"><div className="panel-heading"><div><p className="eyebrow">NEW ENTRY</p><h2>Place an order</h2></div><span className="step">01</span></div><div className="form-grid"><label>Person<select value={form.userId} onChange={e => setForm({ ...form, userId: e.target.value })}><option value="">Select a person</option>{users.map(user => <option value={user.id} key={user.id}>{user.name}</option>)}</select></label><label>Meal<select value={form.menuItemId} onChange={e => setForm({ ...form, menuItemId: e.target.value })}><option value="">Select a meal</option>{menu.filter(item => item.available).map(item => <option value={item.id} key={item.id}>{item.name} · {item.category} · ৳{item.price}</option>)}</select></label><label>Order date<input type="date" value={form.orderDate} onChange={e => setForm({ ...form, orderDate: e.target.value })} /></label><label>Quantity<input type="number" min="1" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} /></label><label className="wide">Notes<input placeholder="Optional delivery note" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></label></div><button className="primary" onClick={() => run(() => api.createOrder(form))}>Create order <span>→</span></button></section><section className="panel"><div className="panel-heading"><div><p className="eyebrow">LIVE QUEUE</p><h2>Recent orders</h2></div><span className="count-label">{orders.length} total</span></div><OrderTable orders={orders} run={run} /></section></div>;
}
function OrderTable({ orders, run }) { return <div className="table-wrap"><table><thead><tr><th>Date</th><th>Person</th><th>Meal</th><th>Category</th><th>Qty</th><th>Status</th><th /></tr></thead><tbody>{orders.map(order => <tr key={order.id}><td>{order.orderDate.slice(0, 10)}</td><td><strong>{order.user.name}</strong><small>{order.user.email}</small></td><td>{order.menuItem.name}</td><td><span className="category-label">{order.menuItem.category}</span></td><td>{order.quantity}</td><td><select className={`status-select ${order.status.toLowerCase()}`} value={order.status} onChange={e => run(() => api.updateOrder(order.id, { status: e.target.value }))}><option>PENDING</option><option>PREPARING</option><option>DELIVERED</option><option>CANCELLED</option></select></td><td><button className="icon-button" title="Delete order" onClick={() => run(() => api.deleteOrder(order.id))}>×</button></td></tr>)}</tbody></table>{orders.length === 0 && <Empty text="No orders yet. Create the first one above." />}</div>; }
function Bills({ users, filter, setFilter, bill, setBill, run }) { return <div className="workspace bills-workspace"><section className="panel form-panel"><div className="panel-heading"><div><p className="eyebrow">ITEMIZED BILL</p><h2>Check a bill</h2></div></div><div className="form-grid"><label>Person<select value={filter.userId} onChange={e => setFilter({ ...filter, userId: e.target.value })}><option value="">Select a person</option>{users.map(user => <option value={user.id} key={user.id}>{user.name}</option>)}</select></label><label>From<input type="date" value={filter.from} onChange={e => setFilter({ ...filter, from: e.target.value })} /></label><label>To<input type="date" value={filter.to} onChange={e => setFilter({ ...filter, to: e.target.value })} /></label></div><button className="primary" onClick={() => run(async () => setBill(await api.bill(filter.userId, filter.from, filter.to)))}>View bill <span>→</span></button></section><section className="panel bill-panel">{bill ? <><div className="panel-heading"><div><p className="eyebrow">{bill.from} TO {bill.to}</p><h2>{bill.user?.name || 'User'}'s bill</h2><p className="bill-email">{bill.user?.email}</p></div><strong className="bill-total">৳{bill.total.toFixed(2)}</strong></div><div className="table-wrap"><table><thead><tr><th>Date</th><th>Meal</th><th>Category</th><th>Unit price</th><th>Qty</th><th>Line total</th></tr></thead><tbody>{bill.items.map(item => <tr key={item.id}><td>{item.orderDate.slice(0, 10)}</td><td>{item.menuItem.name}</td><td><span className="category-label">{item.menuItem.category}</span></td><td>৳{item.unitPrice.toFixed(2)}</td><td>{item.quantity}</td><td><strong>৳{item.lineTotal.toFixed(2)}</strong></td></tr>)}</tbody></table>{bill.items.length === 0 && <Empty text="No orders found in this date range." />}</div></> : <Empty text="Choose a person and date range to view an itemized bill." />}</section></div>; }
function Menu({ menu, form, setForm, run }) { return <div className="workspace"><section className="panel form-panel"><div className="panel-heading"><div><p className="eyebrow">MENU EDITOR</p><h2>Add a meal</h2></div></div><div className="form-grid"><label>Meal name<input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Chicken biryani" /></label><label>Category<select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>{mealCategories.map(category => <option value={category} key={category}>{category}</option>)}</select></label><label>Price (BDT)<input type="number" step="0.01" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} placeholder="250" /></label><label className="wide">Description<input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="What is in this meal?" /></label></div><button className="primary" onClick={() => run(async () => { await api.createMenu(form); setForm(emptyMenu); })}>Add to menu <span>→</span></button></section><section className="panel"><div className="panel-heading"><div><p className="eyebrow">AVAILABLE TODAY</p><h2>Menu</h2></div></div><div className="menu-grid">{menu.map(item => <article className="menu-item" key={item.id}><div className="meal-icon">{item.name.charAt(0)}</div><div><h3>{item.name}</h3><p><span className="category-label">{item.category}</span>{item.description && ` · ${item.description}`}</p><strong>৳{item.price}</strong></div><button className="icon-button" onClick={() => run(() => api.deleteMenu(item.id))}>×</button></article>)}</div>{menu.length === 0 && <Empty text="Your menu is empty." />}</section></div>; }
function Users({ users, form, setForm, run }) { return <div className="workspace"><section className="panel form-panel"><div className="panel-heading"><div><p className="eyebrow">PEOPLE DIRECTORY</p><h2>Register a person</h2></div></div><div className="form-grid"><label>Name<input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></label><label>Email<input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></label><label>Phone<input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></label><label>Address<input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} /></label></div><button className="primary" onClick={() => run(async () => { await api.createUser(form); setForm(emptyUser); })}>Add person <span>→</span></button></section><section className="panel"><div className="panel-heading"><div><p className="eyebrow">DIRECTORY</p><h2>People</h2></div></div><div className="people-list">{users.map(user => <article className="person" key={user.id}><div className="avatar">{user.name.charAt(0)}</div><div><h3>{user.name}</h3><p>{user.email} {user.phone && `· ${user.phone}`}</p><small>{user.address || 'No address added'}</small></div><button className="icon-button" onClick={() => run(() => api.deleteUser(user.id))}>×</button></article>)}</div>{users.length === 0 && <Empty text="No people registered." />}</section></div>; }
function Empty({ text }) { return <div className="empty">{text}</div>; }

createRoot(document.getElementById('root')).render(<App />);
