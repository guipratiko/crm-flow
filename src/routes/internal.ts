import { Router } from 'express';
import { requireInternalApiKey } from '../middleware/internalApiAuth';
import * as internalActivities from '../controllers/internal/activities';

const router = Router();

router.use(requireInternalApiKey);
router.get('/activities/pending-reminders', internalActivities.listPendingReminders);
router.get('/activities/overdue-reminders', internalActivities.listOverdueReminders);
router.get('/activities/daily-digest', internalActivities.listDailyDigestTargets);
router.get('/activities/pending-whatsapp-reminders', internalActivities.listPendingWhatsappReminders);
router.get('/activities/overdue-whatsapp-reminders', internalActivities.listOverdueWhatsappReminders);
router.get('/activities/daily-digest-whatsapp', internalActivities.listDailyDigestWhatsappTargets);
router.get('/activities/daily-digest-whatsapp/tenant/:tenantId', internalActivities.listTenantDailyDigestWhatsapp);
router.post('/activities/mark-reminders-sent', internalActivities.markRemindersSent);
router.post('/activities/mark-overdue-reminders-sent', internalActivities.markOverdueRemindersSent);
router.post('/activities/mark-daily-digests-sent', internalActivities.markDailyDigestsSent);
router.post('/activities/mark-whatsapp-reminders-sent', internalActivities.markWhatsappRemindersSent);
router.post('/activities/mark-overdue-whatsapp-reminders-sent', internalActivities.markOverdueWhatsappRemindersSent);
router.post('/activities/mark-daily-digests-whatsapp-sent', internalActivities.markDailyDigestsWhatsappSent);
router.get('/activities/pending-push-reminders', internalActivities.listPendingPushReminders);
router.get('/activities/overdue-push-reminders', internalActivities.listOverduePushReminders);
router.get('/activities/daily-digest-push', internalActivities.listDailyDigestPushTargets);
router.post('/activities/mark-push-reminders-sent', internalActivities.markPushRemindersSent);
router.post('/activities/mark-overdue-push-reminders-sent', internalActivities.markOverduePushRemindersSent);
router.post('/activities/mark-daily-digests-push-sent', internalActivities.markDailyDigestsPushSent);

export default router;
