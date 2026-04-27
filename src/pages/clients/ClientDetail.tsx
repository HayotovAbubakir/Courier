import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { Navigation } from '@/components/Navigation';
import { DeliveryHistorySection } from '@/components/deliveries/DeliveryHistorySection';
import { Button, Card, EmptyState, Input, Loading, Modal } from '@/components/ui';
import { useApp } from '@/context/AppContext';
import {
  capPaymentAmount,
  formatIntegerInput,
  formatMoney,
  getRemainingBalance,
  normalizePaymentAmountInput,
} from '@/lib/delivery-helpers';
import { getClient, getClientDeliveries, recordPayment } from '@/lib/db-operations';

const OVERPAYMENT_ERROR = "To'lov qoldiq summadan oshib ketdi";

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useApp();
  const [client, setClient] = useState<any>(null);
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedDelivery, setSelectedDelivery] = useState<any>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentError, setPaymentError] = useState('');

  useEffect(() => {
    void loadData();
  }, [id]);

  async function loadData() {
    try {
      setLoading(true);
      const clientData = await getClient(id as string);
      const deliveriesData = await getClientDeliveries(id as string);
      setClient(clientData);
      setDeliveries(deliveriesData || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handlePayment() {
    if (!selectedDelivery || !paymentAmount) return;

    const remainingBalance = getRemainingBalance(
      selectedDelivery.total_amount,
      selectedDelivery.paid_amount
    );
    const amount = Number(paymentAmount);

    if (!Number.isFinite(amount) || amount <= 0) {
      return;
    }

    if (amount > remainingBalance) {
      setPaymentError(OVERPAYMENT_ERROR);
      return;
    }

    try {
      await recordPayment({
        id: uuidv4(),
        delivery_id: selectedDelivery.id,
        amount,
        payment_date: new Date().toISOString().split('T')[0],
        notes: '',
      });

      resetPaymentModal();
      await loadData();
    } catch (error) {
      if (error instanceof Error && error.message === OVERPAYMENT_ERROR) {
        setPaymentError(error.message);
        return;
      }

      console.error('Error recording payment:', error);
    }
  }

  function handlePaymentAmountChange(value: string) {
    const normalizedValue = normalizePaymentAmountInput(value);
    setPaymentAmount(normalizedValue);

    if (!selectedDelivery || !normalizedValue) {
      setPaymentError('');
      return;
    }

    const remainingBalance = getRemainingBalance(
      selectedDelivery.total_amount,
      selectedDelivery.paid_amount
    );

    if (Number(normalizedValue) > remainingBalance) {
      setPaymentError(OVERPAYMENT_ERROR);
      return;
    }

    setPaymentError('');
  }

  function handlePaymentAmountBlur() {
    if (!selectedDelivery || !paymentAmount) {
      setPaymentError('');
      return;
    }

    const remainingBalance = getRemainingBalance(
      selectedDelivery.total_amount,
      selectedDelivery.paid_amount
    );
    const cappedAmount = capPaymentAmount(Number(paymentAmount), remainingBalance);

    setPaymentAmount(String(cappedAmount));
    setPaymentError('');
  }

  function resetPaymentModal() {
    setIsPaymentModalOpen(false);
    setSelectedDelivery(null);
    setPaymentAmount('');
    setPaymentError('');
  }

  if (loading) {
    return (
      <>
        <Navigation />
        <Loading message={t('loading')} />
      </>
    );
  }

  if (!client) {
    return (
      <>
        <Navigation />
        <main className="mx-auto w-full max-w-7xl p-4 sm:p-6 lg:p-8">
          <EmptyState icon="x" title="Topilmadi" description="Do'kon topilmadi" />
        </main>
      </>
    );
  }

  const totalReceivables = deliveries.reduce(
    (sum, delivery) => sum + getRemainingBalance(delivery.total_amount, delivery.paid_amount),
    0
  );
  const totalPaid = deliveries.reduce((sum, delivery) => sum + (delivery.paid_amount || 0), 0);
  const selectedDeliveryRemainingBalance = selectedDelivery
    ? getRemainingBalance(selectedDelivery.total_amount, selectedDelivery.paid_amount)
    : 0;
  const paymentAmountNumber = paymentAmount ? Number(paymentAmount) : 0;
  const canSavePayment =
    selectedDeliveryRemainingBalance > 0 &&
    paymentAmount !== '' &&
    Number.isFinite(paymentAmountNumber) &&
    paymentAmountNumber > 0 &&
    paymentAmountNumber <= selectedDeliveryRemainingBalance;
  const selectedDeliveryRemainingColorClass =
    selectedDeliveryRemainingBalance > 0
      ? 'text-red-600 dark:text-red-300'
      : 'text-green-600 dark:text-green-300';

  return (
    <>
      <Navigation />
      <main className="mx-auto w-full max-w-7xl p-4 sm:p-6 lg:p-8">
        <Link
          to="/clients"
          className="mb-6 inline-flex items-center text-sm font-medium text-blue-600 hover:underline dark:text-blue-300"
        >
          {'<-'} Orqaga
        </Link>

        <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
          <Card className="md:col-span-2">
            <h1 className="mb-4 text-3xl font-bold text-gray-900 dark:text-white">{client.name}</h1>
            <div className="space-y-2 text-gray-600 dark:text-gray-300">
              <p>
                <span className="font-semibold text-gray-800 dark:text-white">Telefon:</span>{' '}
                {client.phone || 'Kiritilmagan'}
              </p>
              <p>
                <span className="font-semibold text-gray-800 dark:text-white">Manzil:</span>{' '}
                {client.address || 'Kiritilmagan'}
              </p>
              {client.created_at && (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  <span className="font-semibold text-gray-800 dark:text-white">Qo'shilgan:</span>{' '}
                  {new Date(client.created_at).toLocaleDateString()}
                </p>
              )}
            </div>
          </Card>

          <div className="space-y-4">
            <Card>
              <p className="mb-2 text-sm text-gray-500 dark:text-gray-300">Faol qarzdorlik</p>
              <p className="mb-4 text-3xl font-bold text-red-600 dark:text-red-300">
                {formatMoney(totalReceivables)}
              </p>

              <p className="mb-2 text-sm text-gray-500 dark:text-gray-300">To'langan</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-300">
                {formatMoney(totalPaid)}
              </p>
            </Card>

            <Card>
              <p className="mb-2 text-sm text-gray-500 dark:text-gray-300">Jami yetkazib berishlar</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {deliveries.length}
              </p>
            </Card>
          </div>
        </div>

        <Card>
          <h2 className="mb-6 text-2xl font-bold text-gray-900 dark:text-white">
            {t('deliveryHistory')}
          </h2>

          <DeliveryHistorySection
            deliveries={deliveries}
            emptyDescription="Bu do'kon uchun yetkazib berishlar hali mavjud emas."
            addDeliveryLink={`/deliveries?client=${client.id}`}
            onUpdated={loadData}
            onPayment={(delivery) => {
              setPaymentAmount('');
              setPaymentError('');
              setSelectedDelivery(delivery);
              setIsPaymentModalOpen(true);
            }}
          />
        </Card>

        <Modal
          isOpen={isPaymentModalOpen}
          onClose={resetPaymentModal}
          title="To'lov qo'shish"
          actions={
            <>
              <Button variant="secondary" onClick={resetPaymentModal}>
                {t('cancel')}
              </Button>
              <Button onClick={handlePayment} disabled={!canSavePayment}>
                To'lovni saqlash
              </Button>
            </>
          }
        >
          {selectedDelivery && (
            <div className="space-y-4">
              <div className="rounded-xl border border-[var(--border)] bg-[var(--card-soft)] p-4">
                <p className="text-sm text-gray-500 dark:text-gray-300">Jami:</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatMoney(selectedDelivery.total_amount)}
                </p>

                <p className="mt-3 text-sm text-gray-500 dark:text-gray-300">To'langan:</p>
                <p className="text-lg font-bold text-green-600 dark:text-green-300">
                  {formatMoney(selectedDelivery.paid_amount || 0)}
                </p>

                <p className="mt-3 text-sm text-gray-500 dark:text-gray-300">Qolgan:</p>
                <p className={`text-lg font-bold ${selectedDeliveryRemainingColorClass}`}>
                  {formatMoney(selectedDeliveryRemainingBalance)}
                </p>
              </div>

              <Input
                label="To'lov summasi"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={formatIntegerInput(paymentAmount)}
                onChange={(event) => handlePaymentAmountChange(event.target.value)}
                onBlur={handlePaymentAmountBlur}
                placeholder="0"
                max={selectedDeliveryRemainingBalance}
                error={paymentError}
              />
            </div>
          )}
        </Modal>
      </main>
    </>
  );
}
