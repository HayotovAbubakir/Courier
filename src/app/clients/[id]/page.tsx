'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Navigation } from '@/components/Navigation';
import { Card, Button, Loading, EmptyState, Badge, Modal, Input } from '@/components/ui';
import { useApp } from '@/context/AppContext';
import { getClient, getClientDeliveries, recordPayment } from '@/lib/db-operations';
import { formatIntegerInput, normalizeIntegerInput, parseIntegerInput } from '@/lib/delivery-helpers';
import Link from 'next/link';
import { v4 as uuidv4 } from 'uuid';

export default function ClientProfilePage() {
  const { id } = useParams();
  const { t } = useApp();
  const [client, setClient] = useState<any>(null);
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedDelivery, setSelectedDelivery] = useState<any>(null);
  const [paymentAmount, setPaymentAmount] = useState('');

  useEffect(() => {
    loadData();
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

    try {
      await recordPayment({
        id: uuidv4(),
        delivery_id: selectedDelivery.id,
        amount: parseIntegerInput(paymentAmount),
        payment_date: new Date().toISOString().split('T')[0],
        notes: '',
        created_at: new Date().toISOString(),
      });

      setIsPaymentModalOpen(false);
      setPaymentAmount('');
      setSelectedDelivery(null);
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

  if (!client) {
    return (
      <>
        <Navigation />
        <main className="flex-1 max-w-7xl mx-auto w-full p-4 sm:p-6 lg:p-8">
          <EmptyState icon="❌" title="Not Found" description="Do'kon topilmadi" />
        </main>
      </>
    );
  }

  const totalReceivables = deliveries.reduce((sum, d) => sum + (d.total_amount - (d.paid_amount || 0)), 0);
  const totalPaid = deliveries.reduce((sum, d) => sum + (d.paid_amount || 0), 0);

  return (
    <>
      <Navigation />
      <main className="flex-1 max-w-7xl mx-auto w-full p-4 sm:p-6 lg:p-8">
        <Link href="/clients" className="text-blue-600 hover:underline mb-4 block">
          ← Orqaga
        </Link>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="md:col-span-2">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">{client.name}</h1>
            <div className="space-y-2 text-gray-600">
              <p>
                <span className="font-semibold">Egasi:</span> {client.owner_name}
              </p>
              <p>
                <span className="font-semibold">Telefon:</span> {client.phone}
              </p>
              <p>
                <span className="font-semibold">Manzil:</span> {client.address}
              </p>
              <p className="text-xs text-gray-500">
                <span className="font-semibold">Ro'yxatdan o'tgan:</span> {new Date(client.created_at).toLocaleDateString()}
              </p>
            </div>
          </Card>

          <div className="space-y-4">
            <Card>
              <p className="text-gray-600 text-sm mb-1">Umumiy qarzdorlik</p>
              <p className="text-2xl font-bold text-red-600">{totalReceivables} so'm</p>
            </Card>
            <Card>
              <p className="text-gray-600 text-sm mb-1">To'langan</p>
              <p className="text-2xl font-bold text-green-600">{totalPaid} so'm</p>
            </Card>
          </div>
        </div>

        <Card>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold">Yetkazib berish tarixi</h2>
            <Link href={`/deliveries/new?client=${client.id}`}>
              <Button size="sm">➕ Yetkazib berish qo'shish</Button>
            </Link>
          </div>

          {deliveries.length === 0 ? (
            <EmptyState
              icon="📦"
              title="No Deliveries"
              description="Hali yetkazib berishlar qo'shilmagan"
            />
          ) : (
            <div className="space-y-4">
              {deliveries.map((delivery: any) => (
                <div key={delivery.id} className="border rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="font-bold text-gray-900">
                        {new Date(delivery.delivery_date).toLocaleDateString()}
                      </p>
                      <p className="text-sm text-gray-600">
                        {delivery.delivery_items?.length || 0} ta mahsulot
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
                        ? '✅ To'langan'
                        : delivery.status === 'partially_paid'
                          ? '⏳ Qisman'
                          : '❌ To'lanmagan'}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-sm mb-3">
                    <div>
                      <p className="text-gray-600">Jami summa</p>
                      <p className="font-bold">{delivery.total_amount} so'm</p>
                    </div>
                    <div>
                      <p className="text-gray-600">To'langan</p>
                      <p className="font-bold text-green-600">{delivery.paid_amount || 0} so'm</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Qolgan</p>
                      <p className="font-bold text-red-600">
                        {delivery.total_amount - (delivery.paid_amount || 0)} so'm
                      </p>
                    </div>
                  </div>

                  {delivery.due_date && (
                    <p className="text-xs text-gray-500 mb-3">
                      Muddati: {new Date(delivery.due_date).toLocaleDateString()}
                    </p>
                  )}

                  <div className="flex gap-2">
                    <Link href={`/deliveries/${delivery.id}`} className="flex-1">
                      <Button variant="secondary" size="sm" className="w-full">
                        Tafsilotlar
                      </Button>
                    </Link>
                    {delivery.status !== 'paid' && (
                      <Button
                        size="sm"
                        onClick={() => {
                          setSelectedDelivery(delivery);
                          setIsPaymentModalOpen(true);
                        }}
                      >
                        Pul to'lash
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </main>

      <Modal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        title="To'lov qayd etish"
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
        {selectedDelivery && (
          <div className="space-y-4">
            <div className="bg-gray-50 p-3 rounded">
              <p className="text-sm text-gray-600">Qolgan summa</p>
              <p className="text-2xl font-bold">
                {selectedDelivery.total_amount - (selectedDelivery.paid_amount || 0)} so'm
              </p>
            </div>
            <Input
              label="To'lov summası"
              type="text"
              inputMode="numeric"
              value={formatIntegerInput(paymentAmount)}
              onChange={(e) => setPaymentAmount(normalizeIntegerInput(e.target.value))}
              placeholder="0"
              max={selectedDelivery.total_amount - (selectedDelivery.paid_amount || 0)}
            />
          </div>
        )}
      </Modal>
    </>
  );
}
