'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Navigation } from '@/components/Navigation';
import { Card, Button, Input, Select, TextArea } from '@/components/ui';
import { useApp } from '@/context/AppContext';
import { createDelivery, createDeliveryItem, getClients } from '@/lib/db-operations';
import { formatIntegerInput, normalizeIntegerInput, parseIntegerInput } from '@/lib/delivery-helpers';
import { v4 as uuidv4 } from 'uuid';
import Link from 'next/link';

interface DeliveryItem {
  product_name: string;
  quantity: number;
  unit: string;
  unit_price: number;
}

export default function NewDeliveryPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useApp();
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<any[]>([]);
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
    loadClients();
  }, []);

  async function loadClients() {
    try {
      const data = await getClients();
      setClients(data || []);
    } catch (error) {
      console.error('Error loading clients:', error);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!formData.client_id) {
      alert('Do\'kon tanlang');
      return;
    }

    if (items.some((item) => !item.product_name || item.quantity <= 0 || item.unit_price < 0)) {
      alert('Barcha mahsulotlarni to\'liq to\'ldiring');
      return;
    }

    try {
      setLoading(true);
      const totalAmount = items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
      const deliveryId = uuidv4();

      await createDelivery({
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

      router.push('/deliveries');
    } catch (error) {
      console.error('Error creating delivery:', error);
      alert('Xato yuz berdi');
    } finally {
      setLoading(false);
    }
  }

  const totalAmount = items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);

  return (
    <>
      <Navigation />
      <main className="flex-1 max-w-4xl mx-auto w-full p-4 sm:p-6 lg:p-8">
        <Link href="/deliveries" className="text-blue-600 hover:underline mb-4 block">
          ← Orqaga
        </Link>

        <Card>
          <h1 className="text-3xl font-bold text-gray-900 mb-8">{t('addDelivery')}</h1>

          <form onSubmit={handleSubmit} noValidate className="space-y-6">
            <Select
              label={t('clientName')}
              value={formData.client_id}
              onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
              options={clients.map((c) => ({ value: c.id, label: c.name }))}
              required
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label={t('deliveryDate')}
                type="date"
                value={formData.delivery_date}
                onChange={(e) => setFormData({ ...formData, delivery_date: e.target.value })}
                required
              />

              <Input
                label={t('dueDate')}
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
              />
            </div>

            <div className="border-t pt-6">
              <h2 className="text-xl font-bold mb-4">{t('products')}</h2>
              <div className="space-y-4">
                {items.map((item, index) => (
                  <div key={index} className="p-4 border rounded bg-gray-50">
                    <Input
                      label={t('productName')}
                      value={item.product_name}
                      onChange={(e) => {
                        const newItems = [...items];
                        newItems[index].product_name = e.target.value;
                        setItems(newItems);
                      }}
                      placeholder="Mahsulot nomi"
                      required
                    />

                    <div className="grid grid-cols-3 gap-2 mt-3">
                      <Input
                        label={t('quantity')}
                        type="text"
                        inputMode="numeric"
                        value={item.quantity}
                        onChange={(e) => {
                          const newItems = [...items];
                          newItems[index].quantity = parseFloat(e.target.value.replace(/,/g, '')) || 0;
                          setItems(newItems);
                        }}
                        required
                      />

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{t('unit')}</label>
                        <select
                          value={item.unit}
                          onChange={(e) => {
                            const newItems = [...items];
                            newItems[index].unit = e.target.value;
                            setItems(newItems);
                          }}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option>kg</option>
                          <option>dona</option>
                          <option>l</option>
                          <option>m</option>
                          <option>m²</option>
                        </select>
                      </div>

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
                        required
                      />
                    </div>

                    <p className="text-sm text-gray-600 mt-2 font-semibold">
                      Jami: {(item.quantity * item.unit_price).toLocaleString()} so'm
                    </p>

                    {items.length > 1 && (
                      <Button
                        type="button"
                        variant="danger"
                        size="sm"
                        onClick={() => setItems(items.filter((_, i) => i !== index))}
                        className="mt-2 w-full"
                      >
                        O'chirish
                      </Button>
                    )}
                  </div>
                ))}
              </div>

              <Button
                type="button"
                variant="secondary"
                onClick={() => setItems([...items, { product_name: '', quantity: 1, unit: 'kg', unit_price: 0 }])}
                className="w-full mt-4"
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

            <div className="bg-blue-50 p-4 rounded">
              <p className="text-sm text-gray-600 mb-1">Yetkazib berish jami summasi</p>
              <p className="text-3xl font-bold text-blue-900">{totalAmount.toLocaleString()} so'm</p>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="secondary"
                size="lg"
                className="flex-1"
                onClick={() => router.back()}
              >
                {t('cancel')}
              </Button>
              <Button
                type="submit"
                size="lg"
                className="flex-1"
                loading={loading}
                disabled={loading}
              >
                {t('save')}
              </Button>
            </div>
          </form>
        </Card>
      </main>
    </>
  );
}
