'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Navigation } from '@/components/Navigation';
import { Card, Button, Loading, EmptyState, Badge, Modal, Input } from '@/components/ui';
import { useApp } from '@/context/AppContext';
import { getDelivery, getDeliveryPayments, recordPayment } from '@/lib/db-operations';
import Link from 'next/link';
import { v4 as uuidv4 } from 'uuid';

export default function DeliveryPage() {
  const { id } = useParams();
  const { t } = useApp();
  const [delivery, setDelivery] = useState<any>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');

  useEffect(() => {
    loadData();
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

    try {
      await recordPayment({
        id: uuidv4(),
        delivery_id: id as string,
        amount: parseFloat(paymentAmount),
        payment_date: new Date().toISOString().split('T')[0],
        notes: '',
        created_at: new Date().toISOString(),
      });

      setIsPaymentModalOpen(false);
      setPaymentAmount('');
      await loadData();
    } catch (error) {
      console.error('Error recording payment:', error);
    }
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
        <main className="flex-1 max-w-7xl mx-auto w-full p-4 sm:p-6 lg:p-8">
          <EmptyState icon="❌" title="Not Found" description="Yetkazib berish topilmadi" />
        </main>
      </>
    );
  }

  const remainingBalance = delivery.total_amount - (delivery.paid_amount || 0);

  return (
    <>
      <Navigation />
      <main className="flex-1 max-w-7xl mx-auto w-full p-4 sm:p-6 lg:p-8">
        <Link href="/deliveries" className="text-blue-600 hover:underline mb-4 block">
          ← Orqaga
        </Link>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="md:col-span-2">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                  {delivery.clients?.name}
                </h1>
                <p className="text-sm text-gray-600 mb-4">
                  {new Date(delivery.delivery_date).toLocaleDateString('uz-UZ', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>
              <Badge
                variant={
                  delivery.status === 'paid'
                    ? 'success'
                    : delivery.status === 'partially_paid'
                      ? 'warning'
                      : 'danger'
                }
              >
                {delivery.status === 'paid'
                  ? '✅ To\'langan'
                  : delivery.status === 'partially_paid'
                    ? '⏳ Qisman'
                    : '❌ To\'lanmagan'}
              </Badge>
            </div>

            <h2 className="text-lg font-bold mb-3">Mahsulotlar</h2>
            {delivery.delivery_items?.length === 0 ? (
              <p className="text-gray-600">Mahsulot yo'q</p>
            ) : (
              <div className="space-y-2">
                {delivery.delivery_items?.map((item: any) => (
                  <div
                    key={item.id}
                    className="flex justify-between items-center p-3 border rounded bg-gray-50"
                  >
                    <div>
                      <p className="font-semibold text-gray-900">{item.product_name}</p>
                      <p className="text-sm text-gray-600">
                        {item.quantity} {item.unit} × {item.unit_price} so'm
                      </p>
                    </div>
                    <p className="font-bold text-gray-900">{item.total_price} so'm</p>
                  </div>
                ))}
              </div>
            )}

            {delivery.notes && (
              <div className="mt-4 p-3 bg-gray-50 rounded">
                <p className="text-sm text-gray-600 mb-1">Izohlar</p>
                <p className="text-gray-900">{delivery.notes}</p>
              </div>
            )}
          </Card>

          <div className="space-y-4">
            <Card>
              <p className="text-gray-600 text-sm mb-1">Jami summa</p>
              <p className="text-3xl font-bold text-gray-900">{delivery.total_amount} so'm</p>
            </Card>
            <Card>
              <p className="text-gray-600 text-sm mb-1">To'langan</p>
              <p className="text-3xl font-bold text-green-600">{delivery.paid_amount || 0} so'm</p>
            </Card>
            <Card className={remainingBalance > 0 ? 'bg-red-50' : 'bg-green-50'}>
              <p className="text-gray-600 text-sm mb-1">Qolgan</p>
              <p className={`text-3xl font-bold ${remainingBalance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {remainingBalance} so'm
              </p>
            </Card>

            {delivery.due_date && (
              <Card>
                <p className="text-gray-600 text-sm mb-1">Muddati</p>
                <p className="font-bold text-gray-900">
                  {new Date(delivery.due_date).toLocaleDateString()}
                </p>
              </Card>
            )}

            {remainingBalance > 0 && (
              <Button onClick={() => setIsPaymentModalOpen(true)} className="w-full" size="lg">
                Pul to'lash
              </Button>
            )}
          </div>
        </div>

        {/* Payment History */}
        <Card>
          <h2 className="text-xl font-bold mb-4">To'lov tarixi</h2>

          {payments.length === 0 ? (
            <p className="text-gray-600 text-center py-8">To'lovlar yo'q</p>
          ) : (
            <div className="space-y-2">
              {payments.map((payment: any) => (
                <div key={payment.id} className="flex justify-between items-center p-3 border rounded">
                  <div>
                    <p className="font-semibold text-gray-900">
                      {new Date(payment.payment_date).toLocaleDateString()}
                    </p>
                    {payment.notes && <p className="text-sm text-gray-600">{payment.notes}</p>}
                  </div>
                  <p className="font-bold text-green-600">{payment.amount} so'm</p>
                </div>
              ))}
            </div>
          )}
        </Card>
      </main>

      <Modal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        title="Pul to'lash"
        actions={
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setIsPaymentModalOpen(false)}>
              Bekor qilish
            </Button>
            <Button onClick={handlePayment} disabled={!paymentAmount}>
              Saqlash
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="bg-red-50 p-3 rounded">
            <p className="text-sm text-gray-600">Qolgan summa</p>
            <p className="text-2xl font-bold text-red-600">{remainingBalance} so'm</p>
          </div>
          <Input
            label="To'lov summası"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={paymentAmount}
            onChange={(e) => setPaymentAmount(e.target.value)}
            placeholder="0"
            max={remainingBalance}
          />
        </div>
      </Modal>
    </>
  );
}
