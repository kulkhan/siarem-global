import { Router } from 'express';
import authRoutes from './auth.routes';
import customersRoutes from './customers.routes';
import shipsRoutes from './ships.routes';
import servicesRoutes from './services.routes';
import invoicesRoutes from './invoices.routes';
import quotesRoutes from './quotes.routes';
import meetingsRoutes from './meetings.routes';
import dashboardRoutes from './dashboard.routes';
import expensesRoutes from './expenses.routes';
import usersRoutes from './users.routes';
import auditRoutes from './audit.routes';
import companiesRoutes from './companies.routes';
import serviceTypesRoutes from './serviceTypes.routes';
import productsRoutes from './products.routes';
import complaintsRoutes from './complaints.routes';
import notificationsRoutes from './notifications.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/companies', companiesRoutes);
router.use('/service-types', serviceTypesRoutes);
router.use('/products', productsRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/customers', customersRoutes);
router.use('/ships', shipsRoutes);
router.use('/services', servicesRoutes);
router.use('/invoices', invoicesRoutes);
router.use('/quotes', quotesRoutes);
router.use('/meetings', meetingsRoutes);
router.use('/expenses', expensesRoutes);
router.use('/users', usersRoutes);
router.use('/audit', auditRoutes);
router.use('/complaints', complaintsRoutes);
router.use('/notifications', notificationsRoutes);

// Health check
router.get('/health', (_req, res) => {
  res.json({ success: true, message: 'API is running', timestamp: new Date().toISOString() });
});

export default router;
