import { Router } from 'express';
import { requireInternalApiKey } from '../middleware/internalApiAuth';
import * as internalActivities from '../controllers/internalActivitiesController';

const router = Router();

router.use(requireInternalApiKey);
router.get('/activities/pending-reminders', internalActivities.listPendingReminders);
router.get('/activities/overdue-reminders', internalActivities.listOverdueReminders);
router.get('/activities/daily-digest', internalActivities.listDailyDigestTargets);
router.post('/activities/mark-reminders-sent', internalActivities.markRemindersSent);
router.post('/activities/mark-overdue-reminders-sent', internalActivities.markOverdueRemindersSent);
router.post('/activities/mark-daily-digests-sent', internalActivities.markDailyDigestsSent);

export default router;
