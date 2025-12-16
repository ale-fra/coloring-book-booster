This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Database Setup

This project uses PostgreSQL with Drizzle ORM. Follow these steps to set up your database:

### 1. Push Database Schema

Push the schema to your database:

```bash
npm run db:push
```

This command uses Drizzle Kit to sync your database schema with the definitions in your code.

### 2. Seed the Database

Populate your database with initial data:

```bash
npm run db:seed
```

This runs the seed script located at `lib/db/seed.ts` to insert sample or required initial data.

### 3. Verify Database Setup

Verify that your database is correctly set up:

```bash
npm run db:verify
```

This runs the verification script at `scripts/verify-db.ts` to check that all tables and data are properly configured.

### Additional Database Commands

- **Create Database**: `npm run db:create` - Creates the database (runs `scripts/create-db.ts`)

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
