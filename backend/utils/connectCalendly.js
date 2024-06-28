const axios = require('axios');
const logger = require('../logs/logger');

// Cache environment variables to avoid repeated a
const CALENDLY_API_KEY = process.env.CALENDLY_API_KEY;
const CALENDLY_USER_URI = process.env.CALENDLY_USER_URI;
const CALENDLY_WEBHOOK_URL = process.env.CALENDLY_WEBHOOK_URL;
const CALENDLY_ORGANIZATION_URI = process.env.CALENDLY_ORGANIZATION_URI;

const manageWebhookSubscription = async () => {
    try {
        let webhookSubscriptions = await fetchWebhookSubscriptions();

        // If there's exactly one subscription and it matches the desired configuration, do nothing
        if (webhookSubscriptions.length === 1) {
            const webhook = await getWebhook(webhookSubscriptions[0].uri);
            if (webhook && isWebhookConfigCorrect(webhook)) {
                logger.info(`[SUCCESS] Webhook subscription is active. No changes made.`);
                return true;
            }
        }

        // If there's more than one subscription or the existing one doesn't match, delete all and create a new one
        await deleteAllWebhookSubscriptions(webhookSubscriptions);
        return await createWebhookSubscription();
    } catch (error) {
        logger.error('[ERROR] An error occurred connecting to calendly:', error.message || error.data || error);
        return false;
    }
};

const fetchWebhookSubscriptions = async () => {
    const options = {
        method: 'GET',
        url: 'https://api.calendly.com/webhook_subscriptions',
        params: { organization: CALENDLY_ORGANIZATION_URI, user: CALENDLY_USER_URI, scope: 'user' },
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${CALENDLY_API_KEY}` }
    };
    const response = await axios.request(options);
    return response.status === 200 ? response.data.collection : [];
};

const getWebhook = async (webhookUri) => {
    const response = await axios.get(webhookUri, { headers: { Authorization: `Bearer ${CALENDLY_API_KEY}` } });
    return response.data.resource;
};

const deleteAllWebhookSubscriptions = async (webhookSubscriptions) => {
    await Promise.all(webhookSubscriptions.map(subscription =>
        axios.delete(subscription.uri, { headers: { Authorization: `Bearer ${CALENDLY_API_KEY}` } })
    ));
};

const createWebhookSubscription = async () => {
    const webhookData = {
        url: CALENDLY_WEBHOOK_URL,
        events: ['invitee.created', 'invitee.canceled'],
        organization: CALENDLY_ORGANIZATION_URI,
        user: CALENDLY_USER_URI,
        scope: 'user'
    };
    const response = await axios.post('https://api.calendly.com/webhook_subscriptions', webhookData, {
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${CALENDLY_API_KEY}` }
    });
    return response.status === 201;
};

function isWebhookConfigCorrect(webhook) {
    return webhook.callback_url === CALENDLY_WEBHOOK_URL &&
           arraysEqual(webhook.events, ['invitee.created', 'invitee.canceled']) &&
           webhook.organization === CALENDLY_ORGANIZATION_URI &&
           webhook.user === CALENDLY_USER_URI &&
           webhook.scope === 'user' &&
           webhook.state === 'active';
}

function arraysEqual(a, b) { // Deep array comparison
    if (a.length !== b.length) return false;
    const sortedA = [...a].sort();
    const sortedB = [...b].sort();
    return sortedA.every((value, index) => value === sortedB[index]);
}

module.exports = manageWebhookSubscription;