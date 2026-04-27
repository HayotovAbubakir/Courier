'use client';

import { useEffect, useState } from 'react';
import { Navigation } from '@/components/Navigation';
import { Card, Button, Input, Loading, EmptyState, Modal, TextArea } from '@/components/ui';
import { useApp } from '@/context/AppContext';
import { getClients, createClient, updateClient, deleteClient } from '@/lib/db-operations';
import Link from 'next/link';
import type { Database } from '@/lib/database.types';
import { v4 as uuidv4 } from 'uuid';

export default function ClientsPage() {
  const { t } = useApp();
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    owner_name: '',
    phone: '',
    address: '',
  });

  useEffect(() => {
    loadClients();
  }, []);

  async function loadClients() {
    try {
      setLoading(true);
      const data = await getClients();
      setClients(data || []);
    } catch (error) {
      console.error('Error loading clients:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    try {
      if (editingClient) {
        await updateClient(editingClient.id, formData);
      } else {
        await createClient({
          id: uuidv4(),
          ...formData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }
      setIsModalOpen(false);
      setFormData({ name: '', owner_name: '', phone: '', address: '' });
      setEditingClient(null);
      await loadClients();
    } catch (error) {
      console.error('Error saving client:', error);
    }
  }

  function handleEdit(client: any) {
    setEditingClient(client);
    setFormData({
      name: client.name,
      owner_name: client.owner_name,
      phone: client.phone,
      address: client.address,
    });
    setIsModalOpen(true);
  }

  function handleNew() {
    setEditingClient(null);
    setFormData({ name: '', owner_name: '', phone: '', address: '' });
    setIsModalOpen(true);
  }

  async function handleDelete(id: string) {
    if (confirm(t('confirmDelete'))) {
      try {
        await deleteClient(id);
        await loadClients();
      } catch (error) {
        console.error('Error deleting client:', error);
      }
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
          <h1 className="text-3xl font-bold text-gray-900">{t('clients')}</h1>
          <Button onClick={handleNew} size="lg">
            ➕ {t('add')}
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {clients.length === 0 ? (
            <div className="col-span-full">
              <EmptyState
                icon="👥"
                title={t('noData')}
                description="Hali do'konlar qo'shilmagan"
                action={<Button onClick={handleNew}>{t('addClient')}</Button>}
              />
            </div>
          ) : (
            clients.map((client: any) => (
              <Card key={client.id} className="flex flex-col">
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-900 mb-1">{client.name}</h3>
                  <p className="text-sm text-gray-600 mb-3">
                    <span className="font-semibold">Egasi:</span> {client.owner_name}
                  </p>
                  <p className="text-sm text-gray-600 mb-1">
                    <span className="font-semibold">Telefon:</span> {client.phone}
                  </p>
                  <p className="text-sm text-gray-600 mb-3">
                    <span className="font-semibold">Manzil:</span> {client.address}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Link href={`/clients/${client.id}`} className="flex-1">
                    <Button variant="secondary" className="w-full" size="sm">
                      👁️ View
                    </Button>
                  </Link>
                  <Button variant="secondary" onClick={() => handleEdit(client)} size="sm">
                    ✏️
                  </Button>
                  <Button variant="danger" onClick={() => handleDelete(client.id)} size="sm">
                    🗑️
                  </Button>
                </div>
              </Card>
            ))
          )}
        </div>
      </main>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingClient ? t('editClient') : t('addClient')}
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
          <Input
            label={t('clientName')}
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Do'kon nomi"
          />
          <Input
            label={t('ownerName')}
            value={formData.owner_name}
            onChange={(e) => setFormData({ ...formData, owner_name: e.target.value })}
            placeholder="Egasi ismi"
          />
          <Input
            label={t('phone')}
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            placeholder="+998 90 000 00 00"
            type="tel"
          />
          <TextArea
            label={t('address')}
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            placeholder="Manzil"
            rows={3}
          />
        </div>
      </Modal>
    </>
  );
}
