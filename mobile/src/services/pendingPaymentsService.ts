import AsyncStorage from '@react-native-async-storage/async-storage';

const PENDING_PAYMENTS_KEY = '@pending_payments';

export interface PendingPayment {
  id: string;
  fromAddress: string; // Address of person who created the bill
  fromName?: string;
  toAddress: string; // My address (who should pay)
  amount: string;
  totalAmount: string;
  participantsCount: number;
  receivedAt: number;
  status: 'pending' | 'paid' | 'ignored';
  paidAt?: number;
}

/**
 * Save a new pending payment request
 */
export async function savePendingPayment(payment: PendingPayment): Promise<void> {
  try {
    const payments = await getPendingPayments();

    // Check if already exists
    const existingIndex = payments.findIndex(p => p.id === payment.id);
    if (existingIndex >= 0) {
      payments[existingIndex] = payment;
    } else {
      payments.unshift(payment);
    }

    await AsyncStorage.setItem(PENDING_PAYMENTS_KEY, JSON.stringify(payments));
  } catch (error) {
    console.error('Error saving pending payment:', error);
    throw error;
  }
}

/**
 * Get all pending payments
 */
export async function getPendingPayments(): Promise<PendingPayment[]> {
  try {
    const data = await AsyncStorage.getItem(PENDING_PAYMENTS_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error loading pending payments:', error);
    return [];
  }
}

/**
 * Get only unpaid pending payments
 */
export async function getUnpaidPayments(): Promise<PendingPayment[]> {
  const payments = await getPendingPayments();
  return payments.filter(p => p.status === 'pending');
}

/**
 * Mark a payment as paid
 */
export async function markAsPaid(paymentId: string): Promise<void> {
  try {
    const payments = await getPendingPayments();
    const index = payments.findIndex(p => p.id === paymentId);

    if (index >= 0) {
      payments[index].status = 'paid';
      payments[index].paidAt = Date.now();
      await AsyncStorage.setItem(PENDING_PAYMENTS_KEY, JSON.stringify(payments));
    }
  } catch (error) {
    console.error('Error marking payment as paid:', error);
    throw error;
  }
}

/**
 * Mark a payment as ignored
 */
export async function markAsIgnored(paymentId: string): Promise<void> {
  try {
    const payments = await getPendingPayments();
    const index = payments.findIndex(p => p.id === paymentId);

    if (index >= 0) {
      payments[index].status = 'ignored';
      await AsyncStorage.setItem(PENDING_PAYMENTS_KEY, JSON.stringify(payments));
    }
  } catch (error) {
    console.error('Error marking payment as ignored:', error);
    throw error;
  }
}

/**
 * Delete a pending payment
 */
export async function deletePendingPayment(paymentId: string): Promise<void> {
  try {
    const payments = await getPendingPayments();
    const filtered = payments.filter(p => p.id !== paymentId);
    await AsyncStorage.setItem(PENDING_PAYMENTS_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Error deleting pending payment:', error);
    throw error;
  }
}

/**
 * Create a pending payment from deep link parameters
 */
export function createPendingPaymentFromLink(
  fromAddress: string,
  amount: string,
  totalAmount: string,
  participantsCount: number,
  myAddress: string
): PendingPayment {
  return {
    id: `payment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    fromAddress,
    toAddress: myAddress,
    amount,
    totalAmount,
    participantsCount,
    receivedAt: Date.now(),
    status: 'pending',
  };
}

/**
 * Get count of unpaid payments
 */
export async function getUnpaidCount(): Promise<number> {
  const unpaid = await getUnpaidPayments();
  return unpaid.length;
}
