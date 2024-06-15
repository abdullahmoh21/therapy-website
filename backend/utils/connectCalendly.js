const axios = require('axios');

// Helper function for deep array comparison
function arraysEqual(a, b) {
    if (a === b) return true;
    if (a == null || b == null) return false;
    if (a.length !== b.length) return false;

    // Sort arrays to ensure order doesn't affect comparison
    const sortedA = [...a].sort();
    const sortedB = [...b].sort();

    for (let i = 0; i < sortedA.length; ++i) {
        if (sortedA[i] !== sortedB[i]) return false;
    }
    return true;
}

const fetchWebhookSubscriptions = async () => {
    try {
        const options = {
            method: 'GET',
            url: 'https://api.calendly.com/webhook_subscriptions',
            params: {
              organization: process.env.CALENDLY_ORGANIZATION_URI,
              user: process.env.CALENDLY_USER_URI,
              scope: 'user'
            },
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${process.env.CALENDLY_API_KEY}`
            }
        };
        const response = await axios.request(options);

        if (response.status === 200) {
            console.log(`\n[LOG] Fetched Webhook list.\n`);
            return response.data.collection;
        }
    } catch (error) {
        console.error(`[LOG] Error fetching webhook list:`, error.message  || error);
        return [];
    }
};

const getWebhook = async (webhookUri) => {
    try {
        const response = await axios.get(webhookUri, {
            headers: { Authorization: `Bearer ${process.env.CALENDLY_API_KEY}` }
        });
        console.log(`[LOG] Webhook details:`, response.data.resource);
        return response.data.resource;
    } catch (error) {
        console.error(`[ERROR] Error fetching webhook details:`, error.response ? error.response.data : error);
        return null; // Changed return type to null for error case
    }
};

const deleteAllWebhookSubscriptions = async (webhookCollection = null) => {
    const subscriptions = webhookCollection || await fetchWebhookSubscriptions();
    const deletePromises = subscriptions.map(subscription =>
        axios.delete(subscription.uri, {
            headers: { Authorization: `Bearer ${process.env.CALENDLY_API_KEY}` }
        }).then(response => {
            if (response.status === 204) {
                console.log(`[LOG] The following Webhook has been deleted: ${subscription.uri} \n`);
            }
        }).catch(error => {
            console.error(`[ERROR] deleting webhook subscription:`, error.response ? error.response.data : error);
        })
    );

    await Promise.allSettled(deletePromises);
    return !deletePromises.some(promise => promise.status === 'rejected');
};

const manageWebhookSubscription = async () => {
    try {
        let webhookSubscriptions = await fetchWebhookSubscriptions();

        if (webhookSubscriptions.length > 1) {
            console.log(`[LOG] Multiple subscriptions found.. deleting`);
            const deletionSuccess = await deleteAllWebhookSubscriptions(webhookSubscriptions);
            if (!deletionSuccess) {
                console.log(`[ERROR] Error deleting subscriptions. Exiting`);
                return false;
            }
            webhookSubscriptions = await fetchWebhookSubscriptions(); // Refetch after deletion
        }

        if (webhookSubscriptions.length === 1) {
            const existingSubscription = webhookSubscriptions[0];
            // console.log(`[LOG] attempting to get webhook with URI:`, existingSubscription.uri);
            const webhook = await getWebhook(existingSubscription.uri);
            if (!webhook) {
                console.log(`[LOG] Error fetching webhook details. Exiting...`);
                return false;
            }

            if (
                webhook.callback_url !== process.env.CALENDLY_WEBHOOK_URL ||
                !arraysEqual(webhook.events, ['invitee.created', 'invitee.canceled']) ||
                webhook.organization !== process.env.CALENDLY_ORGANIZATION_URI ||
                webhook.user !== process.env.CALENDLY_USER_URI ||
                webhook.scope !== 'user' ||
                webhook.state !== 'active'
            ) {
                console.log(`[LOG] Webhook does not match expected configuration.. deleting and recreating`);
                await deleteAllWebhookSubscriptions([existingSubscription]);
                webhookSubscriptions = await fetchWebhookSubscriptions(); // Refetch after deletion
            } else {
                console.log(`[SUCCESS] Webhook subscription is active. No changes made`);
                return true;
            }
        }

        if (webhookSubscriptions.length === 0) {
            const webhookData = {
                url: process.env.CALENDLY_WEBHOOK_URL,
                events: ['invitee.created', 'invitee.canceled'],
                organization: process.env.CALENDLY_ORGANIZATION_URI,
                user: process.env.CALENDLY_USER_URI,
                scope: 'user'
            };
            const response = await axios.post('https://api.calendly.com/webhook_subscriptions', webhookData, {
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${process.env.CALENDLY_API_KEY}`
                }
            });

            if (response.status === 201) {
                console.log('[SUCCESS] New webhook subscription created.');
                return true;
            }
        }
    } catch (error) {
        console.error('[ERROR] An error occurred somewhere:\n', error.message || error.data || error);
        return false;
    }
    console.log(`[LOG] Catch-all returned fasle :`);
    return false;
};

module.exports = manageWebhookSubscription;