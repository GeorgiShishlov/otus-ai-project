import express from 'express';
import cors from 'cors';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

import authRouter from './routes/auth';
import categoriesRouter from './routes/categories';
import transactionsRouter from './routes/transactions';
import budgetsRouter from './routes/budgets';
import recurringRouter from './routes/recurring';
import currenciesRouter from './routes/currencies';
import csvRouter from './routes/csv';
import dashboardRouter from './routes/dashboard';
import changelogRouter from './routes/changelog';
import { startRecurringJob } from './jobs/recurringJob';

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Finance Tracker API',
      version: '1.0.0',
      description: 'Personal finance tracker REST API',
    },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  },
  apis: ['./src/routes/*.ts'],
});

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use('/api/auth', authRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/transactions', transactionsRouter);
app.use('/api/budgets', budgetsRouter);
app.use('/api/recurring', recurringRouter);
app.use('/api/currencies', currenciesRouter);
app.use('/api/csv', csvRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/changelog', changelogRouter);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
  console.log(`Swagger docs: http://localhost:${PORT}/api-docs`);
  startRecurringJob();
});

export default app;
