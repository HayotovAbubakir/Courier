'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Navigation } from '@/components/Navigation';
import { Card, Button, Input, Select, Loading, EmptyState, Modal, TextArea, Badge } from '@/components/ui';
import { useApp } from '@/context/AppContext';
import { getDeliveries, getClients, createDelivery, createDeliveryItem } from '@/lib/db-operations';
import { formatIntegerInput, normalizeIntegerInput, parseIntegerInput } from '@/lib/delivery-helpers';
import Link from 'next/link';
import { v4 as uuidv4 } from 'uuid';

interface DeliveryItem {
  product_name: string;
  quantity: number;
  unit: string;
  unit_price: number;
}

export default function DeliveriesPage() {
  const { t } = useApp();
  const searchParams = useSearchParams();
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    client_id: searchParams.get('client') || '',
    delivery_date: new Date().toISOString().split('T')[0],
    due_date: '',
    notes: '',
  });
  const [items, setItems] = useState<DeliveryItem[]>([
    { product_name: '', quantity: 1, unit: 'kg', unit_price: 0 },
  ]);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const [deliveriesData, clientsData] = await Promise.all([
        getDeliveries(),
        getClients(),
      ]);
      setDeliveries(deliveriesData || []);
      setClients(clientsData || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!formData.client_id) {
      alert('Do\'kon tanlang');
      return;
    }

    if (items.some((item) => !item.product_name || item.quantity <= 0 || item.unit_price < 0)) {
      alert('Barcha mahsulotlarni to\'liq to\'ldiring');
      return;
    }

    try {
      const totalAmount = items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
      const deliveryId = uuidv4();

      const delivery = await createDelivery({
        id: deliveryId,
        client_id: formData.client_id,
        delivery_date: formData.delivery_date,
        due_date: formData.due_date || null,
        total_amount: totalAmount,
        paid_amount: 0,
        status: 'unpaid',
        notes: formData.notes || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      for (const item of items) {
        await createDeliveryItem({
          id: uuidv4(),
          delivery_id: deliveryId,
          product_name: item.product_name,
          quantity: item.quantity,
          unit: item.unit,
          unit_price: item.unit_price,
          total_price: item.quantity * item.unit_price,
          created_at: new Date().toISOString(),
        });
      }

      setIsModalOpen(false);
      setFormData({
        client_id: '',
        delivery_date: new Date().toISOString().split('T')[0],
        due_date: '',
        notes: '',
      });
      setItems([{ product_name: '', quantity: 1, unit: 'kg', unit_price: 0 }]);
      await loadData();
    } catch (error) {
      console.error('Error saving delivery:', error);
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

  return (
    <>
      <Navigation />
      <main className="flex-1 max-w-7xl mx-auto w-full p-4 sm:p-6 lg:p-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">{t('deliveries')}</h1>
          <Button onClick={() => setIsModalOpen(true)} size="lg">
            ➕ {t('add')}
          </Button>
        </div>

        <div className="space-y-4">
          {deliveries.length === 0 ? (
            <EmptyState
              icon="📦"
              title={t('noData')}
              description="Hali yetkazib berishlar qo'shilmagan"
              action={<Button onClick={() => setIsModalOpen(true)}>{t('addDelivery')}</Button>}
            />
          ) : (
            deliveries.map((delivery: any) => (
              <Card key={delivery.id} className="hover:shadow-lg transition-shadow">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">{delivery.clients?.name}</p>
                    <p className="font-bold text-lg text-gray-900">
                      {new Date(delivery.delivery_date).toLocaleDateString()}
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

                <div className="grid grid-cols-3 gap-4 mb-4 text-sm">
                  <div>
                    <p className="text-gray-600">Mahsulot soni</p>
                    <p className="font-bold">{delivery.delivery_items?.length || 0}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Summa</p>
                    <p className="font-bold">{delivery.total_amount} so'm</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Qolgan</p>
                    <p className="font-bold text-red-600">
                      {delivery.total_amount - (delivery.paid_amount || 0)} so'm
                    </p>
                  </div>
                </div>

                {delivery.due_date && (
                  <p className="text-xs text-gray-500 mb-4">
                    Muddati: {new Date(delivery.due_date).toLocaleDateString()}
                  </p>
                )}

                <Link href={`/deliveries/${delivery.id}`}>
                  <Button variant="secondary" size="sm" className="w-full">
                    Tafsilotlar
                  </Button>
                </Link>
              </Card>
            ))
          )}
        </div>
      </main>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={t('addDelivery')}
        actions={
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
              {t('cancel')}
            </Button>
            <Button onClick={handleSave}>{t('save')}</Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Select
            label={t('clientName')}
            value={formData.client_id}
            onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
            options={clients.map((c) => ({ value: c.id, label: c.name }))}
          />
          <Input
            label={t('deliveryDate')}
            type="date"
            value={formData.delivery_date}
            onChange={(e) => setFormData({ ...formData, delivery_date: e.target.value })}
          />
          <Input
            label={t('dueDate')}
            type="date"
            value={formData.due_date}
            onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
          />

          <div className="border-t pt-4">
            <h3 className="font-bold mb-3">{t('products')}</h3>
            {items.map((item, index) => (
              <div key={index} className="mb-4 p-3 border rounded bg-gray-50">
                <Input
                  label={t('productName')}
                  value={item.product_name}
                  onChange={(e) => {
                    const newItems = [...items];
                    newItems[index].product_name = e.target.value;
                    setItems(newItems);
                  }}
                  placeholder="Mahsulot nomi"
                />
                <div className="grid grid-cols-3 gap-2 mt-2">
                  <Input
                    label={t('quantity')}
                    type="text"
                    inputMode="numeric"
                    value={item.quantity}
                    onChange={(e) => {
                      const newItems = [...items];
                      newItems[index].quantity = parseFloat(e.target.value) || 0;
                      setItems(newItems);
                    }}
                  />
                  <select
                    value={item.unit}
                    onChange={(e) => {
                      const newItems = [...items];
                      newItems[index].unit = e.target.value;
                      setItems(newItems);
                    }}
                    className="px-2 py-2 border border-gray-300 rounded text-sm"
                  >
                    <option>kg</option>
                    <option>dona</option>
                    <option>l</option>
                    <option>m</option>
                    <option>m²</option>
                  </select>
                  <Input
                    label={t('unitPrice')}
                    type="text"
                    inputMode="numeric"
                    value={formatIntegerInput(item.unit_price)}
                    onChange={(e) => {
                      const newItems = [...items];
                      const normalizedValue = normalizeIntegerInput(e.target.value);
                      newItems[index].unit_price = parseIntegerInput(normalizedValue);
                      setItems(newItems);
                    }}
                  />
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  Jami: {(item.quantity * item.unit_price).toLocaleString()} so'm
                </p>
              </div>
            ))}
            <Button
              variant="secondary"
              onClick={() => setItems([...items, { product_name: '', quantity: 1, unit: 'kg', unit_price: 0 }])}
              className="w-full mb-4"
            >
              + Mahsulot qo'shish
            </Button>
          </div>

          <TextArea
            label={t('notes')}
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            rows={2}
            placeholder="Izohlar (ixtiyoriy)"
          />

          <div className="bg-blue-50 p-3 rounded">
            <p className="text-sm text-gray-600 mb-1">Jami summa</p>
            <p className="text-2xl font-bold text-blue-900">
              {items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0).toLocaleString()} so'm
            </p>
          </div>
        </div>
      </Modal>
    </>
  );
}
