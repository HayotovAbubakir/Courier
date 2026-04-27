'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Navigation } from '@/components/Navigation';
import { Card, Button, Input, TextArea } from '@/components/ui';
import { useApp } from '@/context/AppContext';
import { createClient } from '@/lib/db-operations';
import { v4 as uuidv4 } from 'uuid';
import Link from 'next/link';

export default function NewClientPage() {
  const router = useRouter();
  const { t } = useApp();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    owner_name: '',
    phone: '',
    address: '',
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (!formData.name || !formData.owner_name || !formData.phone || !formData.address) {
      alert('Barcha maydonlarni to\'ldiring');
      return;
    }

    try {
      setLoading(true);
      await createClient({
        id: uuidv4(),
        ...formData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      router.push('/clients');
    } catch (error) {
      console.error('Error creating client:', error);
      alert('Xato yuz berdi');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Navigation />
      <main className="flex-1 max-w-2xl mx-auto w-full p-4 sm:p-6 lg:p-8">
        <Link href="/clients" className="text-blue-600 hover:underline mb-4 block">
          ← Orqaga
        </Link>

        <Card>
          <h1 className="text-3xl font-bold text-gray-900 mb-8">{t('addClient')}</h1>

          <form onSubmit={handleSubmit} className="space-y-6">
            <Input
              label={t('clientName')}
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Do'kon nomi"
              required
            />

            <Input
              label={t('ownerName')}
              value={formData.owner_name}
              onChange={(e) => setFormData({ ...formData, owner_name: e.target.value })}
              placeholder="Egasi ismi"
              required
            />

            <Input
              label={t('phone')}
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="+998 90 000 00 00"
              type="tel"
              required
            />

            <TextArea
              label={t('address')}
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="Manzil"
              rows={3}
              required
            />

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
