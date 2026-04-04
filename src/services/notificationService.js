// Notification Service Helper for ExpressMartAdmin
// Provides admin-level notification functions

import { supabase } from '../../supabase';

/**
 * Send notification to a specific user
 */
export const sendUserNotification = async (userId, appType, title, body, data = {}) => {
    try {
        const { data: result, error } = await supabase.functions.invoke('send-push-notification', {
            body: {
                userId,
                appType,
                title,
                body,
                data,
                notificationType: 'system',
                android: {
                    channelId: 'default',
                    priority: 'high',
                },
            },
        });

        if (error) throw error;
        return { success: true, data: result };
    } catch (err) {
        console.error('Failed to send notification:', err);
        return { success: false, error: err.message };
    }
};

/**
 * Broadcast notification to all users of a specific app type
 */
export const broadcastToAppType = async (appType, title, body, data = {}) => {
    try {
        // Get all active tokens for the app type
        const { data: tokens, error: fetchError } = await supabase
            .from('express_device_tokens')
            .select('fcm_token')
            .eq('app_type', appType)
            .eq('is_active', true);

        if (fetchError) throw fetchError;

        if (!tokens || tokens.length === 0) {
            return { success: true, data: null, recipientCount: 0 };
        }

        const { data: result, error } = await supabase.functions.invoke('send-push-notification', {
            body: {
                tokens: tokens.map(t => t.fcm_token),
                title,
                body,
                data,
                notificationType: 'system',
                android: {
                    channelId: 'system',
                    priority: 'high',
                },
            },
        });

        if (error) throw error;
        return { success: true, data: result, recipientCount: tokens.length };
    } catch (err) {
        console.error('Failed to broadcast notification:', err);
        return { success: false, error: err.message };
    }
};

/**
 * Broadcast to all app types (system-wide announcement)
 */
export const broadcastSystemWide = async (title, body, data = {}) => {
    try {
        const appTypes = ['customer', 'seller', 'admin'];
        const results = await Promise.all(
            appTypes.map(appType => broadcastToAppType(appType, title, body, data))
        );

        const totalRecipients = results.reduce((sum, r) => sum + (r.recipientCount || 0), 0);
        const allSuccessful = results.every(r => r.success);

        return {
            success: allSuccessful,
            results,
            totalRecipients,
        };
    } catch (err) {
        console.error('Failed to broadcast system-wide:', err);
        return { success: false, error: err.message };
    }
};

// ============ Seller Notifications ============

/**
 * Notify seller about store approval
 */
export const notifySellerStoreApproved = async (sellerId, storeName) => {
    return sendUserNotification(
        sellerId,
        'seller',
        'Store Approved! 🎉',
        `Congratulations! Your store "${storeName}" has been approved and is now live.`,
        { screen: 'Dashboard' }
    );
};

/**
 * Notify seller about store rejection
 */
export const notifySellerStoreRejected = async (sellerId, storeName, reason) => {
    return sendUserNotification(
        sellerId,
        'seller',
        'Store Review Update',
        `Your store "${storeName}" requires some changes: ${reason}`,
        { screen: 'Settings' }
    );
};

/**
 * Notify seller about product moderation
 */
export const notifySellerProductModerated = async (sellerId, productName, action, reason = '') => {
    const messages = {
        approved: { title: 'Product Approved ✅', body: `Your product "${productName}" has been approved.` },
        rejected: { title: 'Product Rejected', body: `Your product "${productName}" was rejected: ${reason}` },
        flagged: { title: 'Product Flagged ⚠️', body: `Your product "${productName}" has been flagged for review.` },
        removed: { title: 'Product Removed', body: `Your product "${productName}" has been removed: ${reason}` },
    };

    const message = messages[action] || { title: 'Product Update', body: `Update on "${productName}": ${action}` };

    return sendUserNotification(sellerId, 'seller', message.title, message.body, {
        screen: 'Catalog',
    });
};

/**
 * Notify seller about payout
 */
export const notifySellerPayout = async (sellerId, amount, status) => {
    const messages = {
        processing: { title: 'Payout Processing', body: `Your payout of $${amount} is being processed.` },
        completed: { title: 'Payout Complete! 💰', body: `Your payout of $${amount} has been sent to your account.` },
        failed: { title: 'Payout Failed', body: `Your payout of $${amount} failed. Please check your payment details.` },
    };

    const message = messages[status] || { title: 'Payout Update', body: `Payout status: ${status}` };

    return sendUserNotification(sellerId, 'seller', message.title, message.body, {
        screen: 'Profile',
    });
};

// ============ Customer Notifications ============

/**
 * Notify customer about order status update (mirror of seller helper)
 */
export const notifyCustomerOrderUpdate = async (
    customerId,
    orderId,
    status,
    orderNumber,
) => {
    // normalize spelling variations
    const normalizedStatus = status === 'canceled' ? 'cancelled' : status;

    const statusMessages = {
        confirmed: { title: 'Order Confirmed! 🎉', body: `Your order #${orderNumber} has been confirmed by the seller.` },
        processing: { title: 'Order Processing', body: `Your order #${orderNumber} is being prepared.` },
        packed: { title: 'Order Packed 🧩', body: `Your order #${orderNumber} has been packed and is ready to ship.` },
        ready: { title: 'Order Ready! 📦', body: `Your order #${orderNumber} is ready for pickup/delivery.` },
        shipped: { title: 'Order Shipped! 🚚', body: `Your order #${orderNumber} is on its way!` },
        delivered: { title: 'Order Delivered! ✅', body: `Your order #${orderNumber} has been delivered. Enjoy!` },
        cancelled: { title: 'Order Cancelled', body: `Your order #${orderNumber} has been cancelled.` },
    };

    const message = statusMessages[normalizedStatus] || {
        title: 'Order Update',
        body: `Your order #${orderNumber} status: ${status}`,
    };

    return sendUserNotification(
        customerId,
        'customer',
        message.title,
        message.body,
        {
            orderId,
            status,
            orderNumber,
            screen: 'Orders',
        },
    );
};

/**
 * Notify customer about refund
 */
export const notifyCustomerRefund = async (customerId, amount, orderNumber) => {
    return sendUserNotification(
        customerId,
        'customer',
        'Refund Processed 💰',
        `Your refund of $${amount} for order #${orderNumber} has been processed.`,
        { screen: 'Orders' }
    );
};

/**
 * Notify customer about account issue
 */
export const notifyCustomerAccountIssue = async (customerId, issue) => {
    return sendUserNotification(
        customerId,
        'customer',
        'Account Notice',
        issue,
        { screen: 'Account' }
    );
};

// ============ Support Notifications ============

/**
 * Notify user about support ticket update
 */
export const notifyTicketUpdate = async (userId, appType, ticketId, message) => {
    return sendUserNotification(
        userId,
        appType,
        'Support Ticket Update',
        message,
        { ticketId, screen: 'Support' }
    );
};

// ============ Analytics ============

/**
 * Get notification statistics
 */
export const getNotificationStats = async (days = 7) => {
    try {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const { data, error } = await supabase
            .from('express_notification_logs')
            .select('status, notification_type, created_at')
            .gte('created_at', startDate.toISOString());

        if (error) throw error;

        const stats = {
            total: data.length,
            sent: data.filter(n => n.status === 'sent').length,
            failed: data.filter(n => n.status === 'failed').length,
            byType: {},
        };

        data.forEach(n => {
            const type = n.notification_type || 'general';
            stats.byType[type] = (stats.byType[type] || 0) + 1;
        });

        return { success: true, stats };
    } catch (err) {
        console.error('Failed to get notification stats:', err);
        return { success: false, error: err.message };
    }
};

export default {
    sendUserNotification,
    broadcastToAppType,
    broadcastSystemWide,
    notifySellerStoreApproved,
    notifySellerStoreRejected,
    notifySellerProductModerated,
    notifySellerPayout,
    notifyCustomerRefund,
    notifyCustomerAccountIssue,
    notifyTicketUpdate,
    getNotificationStats,
};
