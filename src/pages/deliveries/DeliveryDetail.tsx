import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { Navigation } from '@/components/Navigation';
import { Badge, Button, Card, EmptyState, ImageLightbox, Input, Loading, Modal } from '@/components/ui';
import { useApp } from '@/context/AppContext';
import {
  capPaymentAmount,
  formatIntegerInput,
  formatMoney,
  getDeliveryRouteLabel,
  getPaymentStatus,
  getRemainingBalance,
  getStatusBadgeVariant,
  getStatusLabel,
  normalizePaymentAmountInput,
} from '@/lib/delivery-helpers';
import { getDelivery, getDeliveryPayments, recordPayment } from '@/lib/db-operations';

const OVERPAYMENT_ERROR = "To'lov qoldiq summadan oshib ketdi";

export default function DeliveryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t, showToast } = useApp();
  const [delivery, setDelivery] = useState<any>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentError, setPaymentError] = useState('');
  const [lightboxImage, setLightboxImage] = useState<{ src: string; alt: string } | null>(null);

  useEffect(() => {
    void loadData();
  }, [id]);

  async function loadData() {
    try {
      setLoading(true);
      const deliveryData = await getDelivery(id as string);
      const paymentsData = await getDeliveryPayments(id as string);
      setDelivery(deliveryData);
      setPayments(paymentsData || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handlePayment() {
    if (!paymentAmount) return;

    const amount = Number(paymentAmount);

    if (!Number.isFinite(amount) || amount <= 0) {
      return;
    }

    if (amount > remainingBalance) {
      setPaymentError(OVERPAYMENT_ERROR);
      return;
    }

    const currentPaymentAmount = paymentAmount;

    setIsPaymentModalOpen(false);
    showToast({
      type: 'info',
      message: "To'lov saqlanmoqda...",
      durationMs: 1600,
    });

    try {
      await recordPayment({
        id: uuidv4(),
        delivery_id: id as string,
        amount,
        payment_date: new Date().toISOString().split('T')[0],
        notes: '',
      });

      setPaymentAmount('');
      setPaymentError('');
      await loadData();
      showToast({
        type: 'success',
        message: "To'lov saqlandi",
      });
    } catch (error) {
      if (error instanceof Error && error.message === OVERPAYMENT_ERROR) {
        setPaymentAmount(currentPaymentAmount);
        setPaymentError(error.message);
        setIsPaymentModalOpen(true);
        showToast({
          type: 'warning',
          message: error.message,
        });
        return;
      }

      setPaymentAmount(currentPaymentAmount);
      setPaymentError('');
      setIsPaymentModalOpen(true);
      showToast({
        type: 'error',
        message: "To'lovni saqlashda xato yuz berdi",
      });
      console.error('Error recording payment:', error);
    }
  }

  function handlePaymentAmountChange(value: string) {
    const normalizedValue = normalizePaymentAmountInput(value);
    setPaymentAmount(normalizedValue);

    if (!normalizedValue) {
      setPaymentError('');
      return;
    }

    if (Number(normalizedValue) > remainingBalance) {
      setPaymentError(OVERPAYMENT_ERROR);
      return;
    }

    setPaymentError('');
  }

  function handlePaymentAmountBlur() {
    if (!paymentAmount) {
      setPaymentError('');
      return;
    }

    const cappedAmount = capPaymentAmount(Number(paymentAmount), remainingBalance);

    setPaymentAmount(String(cappedAmount));
    setPaymentError('');
  }

  function resetPaymentModal() {
    setIsPaymentModalOpen(false);
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

  if (!delivery) {
    return (
      <>
        <Navigation />
        <main className="mx-auto w-full max-w-7xl p-4 sm:p-6 lg:p-8">
          <EmptyState icon="x" title="Topilmadi" description="Yetkazib berish topilmadi" />
        </main>
      </>
    );
  }

  const remainingBalance = getRemainingBalance(delivery.total_amount, delivery.paid_amount || 0);
  const deliveryStatus = getPaymentStatus(delivery.total_amount, delivery.paid_amount || 0);
  const remainingBalanceColorClass =
    remainingBalance > 0 ? 'text-red-600 dark:text-red-300' : 'text-green-600 dark:text-green-300';
  const paymentAmountNumber = paymentAmount ? Number(paymentAmount) : 0;
  const canSavePayment =
    remainingBalance > 0 &&
    paymentAmount !== '' &&
    Number.isFinite(paymentAmountNumber) &&
    paymentAmountNumber > 0 &&
    paymentAmountNumber <= remainingBalance;

  return (
    <>
      <Navigation />
      <main className="mx-auto w-full max-w-7xl p-4 sm:p-6 lg:p-8">
        <Link
          to="/deliveries"
          className="mb-6 inline-flex items-center text-sm font-medium text-blue-600 hover:underline dark:text-blue-300"
        >
          {'<-'} Orqaga
        </Link>

        <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
          <Card className="md:col-span-2">
            <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <h1 className="mb-2 text-2xl font-bold text-gray-900 dark:text-white">
                  {delivery.clients?.name}
                </h1>
                <p className="mb-2 text-sm font-medium text-gray-600 dark:text-gray-300">
                  {getDeliveryRouteLabel(delivery.factories?.name, delivery.clients?.name)}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  {new Date(delivery.delivery_date).toLocaleDateString('uz-UZ', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>
              <Badge variant={getStatusBadgeVariant(deliveryStatus)}>
                {getStatusLabel(deliveryStatus)}
              </Badge>
            </div>

            <h2 className="mb-3 text-lg font-bold text-gray-900 dark:text-white">Mahsulotlar</h2>
            {delivery.delivery_items?.length === 0 ? (
              <p className="text-gray-600 dark:text-gray-300">Mahsulot yo'q</p>
            ) : (
              <div className="space-y-2">
                {delivery.delivery_items?.map((item: any) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-xl border border-gray-200 bg-slate-50 p-3 dark:border-[#334155] dark:bg-slate-900/40"
                  >
                    <div className="flex items-center gap-3">
                      {item.product_image_url ? (
                        <button
                          type="button"
                          onClick={() =>
                            setLightboxImage({
                              src: item.product_image_url,
                              alt: item.product_name,
                            })
                          }
                          className="shrink-0 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                          aria-label={`${item.product_name} rasmini kattalashtirish`}
                        >
                          <img
                            src={item.product_image_url}
                            alt={item.product_name}
                            className="h-14 w-14 cursor-zoom-in rounded-lg object-cover transition-opacity hover:opacity-90"
                          />
                        </button>
                      ) : (
                        <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-slate-200 text-xs text-gray-500 dark:bg-slate-800 dark:text-slate-400">
                          Rasm yo'q
                        </div>
                      )}
                      <div>
                        <p className="font-semibold text-gray-800 dark:text-white">
                          {item.product_name}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                          {item.quantity} {item.unit} x {formatMoney(item.unit_price)}
                        </p>
                      </div>
                    </div>
                    <p className="font-bold text-gray-800 dark:text-white">{formatMoney(item.total_price)}</p>
                  </div>
                ))}
              </div>
            )}

            {delivery.notes && (
              <div className="mt-4 rounded-xl border border-gray-200 bg-slate-50 p-4 dark:border-[#334155] dark:bg-slate-900/40">
                <p className="mb-1 text-sm text-gray-600 dark:text-gray-300">Izohlar</p>
                <p className="text-gray-900 dark:text-white">{delivery.notes}</p>
              </div>
            )}
          </Card>

          <div className="space-y-4">
            <Card>
              <p className="mb-2 text-sm text-gray-500 dark:text-gray-300">Jami summa</p>
              <p className="mb-6 text-3xl font-bold text-gray-900 dark:text-white">
                {formatMoney(delivery.total_amount)}
              </p>

              <p className="mb-2 text-sm text-gray-500 dark:text-gray-300">To'langan</p>
              <p className="mb-6 text-2xl font-bold text-green-600 dark:text-green-300">
                {formatMoney(delivery.paid_amount || 0)}
              </p>

              <p className="mb-2 text-sm text-gray-500 dark:text-gray-300">Qolgan</p>
              <p className={`mb-6 text-2xl font-bold ${remainingBalanceColorClass}`}>
                {formatMoney(remainingBalance)}
              </p>

              {delivery.due_date && (
                <>
                  <p className="mb-2 text-sm text-gray-500 dark:text-gray-300">To'lov muddati</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">
                    {new Date(delivery.due_date).toLocaleDateString()}
                  </p>
                </>
              )}
            </Card>

            {remainingBalance > 0 && deliveryStatus !== 'paid' && (
              <Button
                onClick={() => {
                  setPaymentAmount('');
                  setPaymentError('');
                  setIsPaymentModalOpen(true);
                }}
                className="w-full"
                size="lg"
              >
                To'lov qo'shish
              </Button>
            )}
          </div>
        </div>

        {payments.length > 0 && (
          <Card>
            <h2 className="mb-4 text-xl font-bold text-gray-900 dark:text-white">To'lovlar tarixi</h2>
            <div className="space-y-3">
              {payments.map((payment: any) => (
                <div
                  key={payment.id}
                  className="flex items-center justify-between gap-3 border-b border-gray-200 pb-3 last:border-b-0 last:pb-0 dark:border-[#334155]"
                >
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {formatMoney(payment.amount)}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      {new Date(payment.payment_date).toLocaleDateString()}
                    </p>
                  </div>
                  {payment.notes && (
                    <p className="text-sm text-gray-600 dark:text-gray-300">{payment.notes}</p>
                  )}
                </div>
              ))}
            </div>
          </Card>
        )}

        <Modal
          isOpen={isPaymentModalOpen}
          onClose={resetPaymentModal}
          title="To'lov qo'shish"
          actions={
            <>
              <Button variant="secondary" onClick={resetPaymentModal} type="button">
                {t('cancel')}
              </Button>
              <Button type="submit" form="delivery-payment-form" disabled={!canSavePayment}>
                To'lovni saqlash
              </Button>
            </>
          }
        >
          <form
            id="delivery-payment-form"
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              if (canSavePayment) {
                void handlePayment();
              }
            }}
          >
            <div className="rounded-xl border border-gray-200 bg-slate-50 p-4 dark:border-[#334155] dark:bg-slate-900/40">
              <p className="text-sm text-gray-500 dark:text-gray-300">Qolgan summa:</p>
              <p className={`text-3xl font-bold ${remainingBalanceColorClass}`}>
                {formatMoney(remainingBalance)}
              </p>
            </div>
            <Input
              label="To'lov summasi"
              type="text"
              inputMode="numeric"
              value={formatIntegerInput(paymentAmount)}
              onChange={(event) => handlePaymentAmountChange(event.target.value)}
              onBlur={handlePaymentAmountBlur}
              placeholder="0"
              max={remainingBalance}
              error={paymentError}
            />
          </form>
        </Modal>

        <ImageLightbox
          isOpen={Boolean(lightboxImage)}
          src={lightboxImage?.src ?? ''}
          alt={lightboxImage?.alt ?? 'Mahsulot rasmi'}
          onClose={() => setLightboxImage(null)}
        />
      </main>
    </>
  );
}
