import { Router } from 'express';
import { protect, requireTenant } from '../middleware/auth';
import * as contacts from '../controllers/contactsController';
import * as companies from '../controllers/companiesController';
import * as deals from '../controllers/dealsController';
import * as products from '../controllers/productsController';
import * as activities from '../controllers/activitiesController';
import * as timeline from '../controllers/timelineController';
import * as dashboard from '../controllers/dashboardController';

const router = Router();

router.use(protect, requireTenant);

router.get('/dashboard', dashboard.getDashboard);

router.get('/contacts', contacts.listContacts);
router.get('/contacts/:id', contacts.getContact);
router.post('/contacts', contacts.createContact);
router.put('/contacts/:id', contacts.updateContact);
router.delete('/contacts/:id', contacts.deleteContact);

router.get('/companies', companies.listCompanies);
router.get('/companies/:id', companies.getCompany);
router.post('/companies', companies.createCompany);
router.put('/companies/:id', companies.updateCompany);
router.delete('/companies/:id', companies.deleteCompany);

router.get('/pipeline', deals.listPipelines);
router.get('/deals', deals.listDeals);
router.get('/deals/:id', deals.getDeal);
router.post('/deals', deals.createDeal);
router.put('/deals/:id', deals.updateDeal);
router.delete('/deals/:id', deals.deleteDeal);
router.patch('/deals/:id/move-stage', deals.moveDealStage);
router.post('/deals/:dealId/contacts', deals.addDealContact);
router.delete('/deals/:dealId/contacts/:contactId', deals.removeDealContact);
router.post('/deals/:dealId/products', deals.addDealProduct);
router.delete('/deals/:dealId/products/:productId', deals.removeDealProduct);

router.get('/products', products.listProducts);
router.post('/products', products.createProduct);
router.put('/products/:id', products.updateProduct);
router.delete('/products/:id', products.deleteProduct);

router.get('/activities', activities.listActivities);
router.post('/activities', activities.createActivity);
router.put('/activities/:id', activities.updateActivity);
router.delete('/activities/:id', activities.deleteActivity);
router.patch('/activities/:id/complete', activities.completeActivity);

router.get('/timeline/contact/:id', timeline.getContactTimeline);
router.get('/timeline/company/:id', timeline.getCompanyTimeline);
router.get('/timeline/deal/:id', timeline.getDealTimeline);

export default router;
