# BJIT Meals

A small three-tier meal management application for managing people, the daily menu, and meal orders!

## Stack

- Frontend: React + Vite, served by Nginx
- Backend: Express + Prisma
- Database: MySQL 8.4 locally, or Aurora MySQL through `DATABASE_URL`
- Runtime: Docker Compose

## Start with Docker

```bash
docker compose up --build
```

Open the frontend at [http://localhost](http://localhost). The API health check is available at `http://localhost:4000/api/health`.

The first backend start runs `prisma db push` to create/update the tables from the Prisma schema. Local MySQL data persists in the `mysql_data` Docker volume.

## Switch to Aurora MySQL

1. Set `DB_HOST` to the Aurora cluster endpoint.
2. Set `DB_PORT`, `DB_NAME`, `DB_USER`, and `DB_PASSWORD` to the Aurora values.
3. Set `DATABASE_URL` explicitly to the Aurora connection string, for example:

```env
DATABASE_URL=mysql://USER:PASSWORD@aurora-cluster-endpoint:3306/bjit_meals
```

4. Start the application services with the Aurora override. This removes the local database dependency:

```bash
docker compose -f docker-compose.yml -f docker-compose.aurora.yml up --build backend frontend
```

Do not commit `.env`; it is ignored by Git. Use `.env.example` as the template for other environments.

## CRUD API

- `GET|POST /api/users`, `PUT|DELETE /api/users/:id`
- `GET|POST /api/menu`, `PUT|DELETE /api/menu/:id`
- `GET|POST /api/orders`, `PUT|DELETE /api/orders/:id`
- `GET /api/bills/:userId?from=YYYY-MM-DD&to=YYYY-MM-DD` for inclusive itemized bills

Orders reference both a user and a menu item, and every new order requires an explicit order date. Bills calculate each line as menu price multiplied by quantity, then total the selected user's orders across the inclusive date range. Deleting a user deletes their orders; deleting a menu item with existing orders is rejected by the database relation.

## Development without Docker

Install dependencies in `backend` and `frontend`, then set `DATABASE_URL` in the shell or `.env` and run each package's `dev` script. Docker is the recommended workflow for this project.