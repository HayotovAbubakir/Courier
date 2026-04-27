import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { Navigation } from '@/components/Navigation';
import { Button, Card, EmptyState, Input, Loading, Modal, TextArea } from '@/components/ui';
import { useApp } from '@/context/AppContext';
import type { Database } from '@/lib/database.types';
import { createClient, deleteClient, getClients, updateClient } from '@/lib/db-operations';

export default function ClientsPage() {
  const { t } = useApp();
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
  });

  useEffect(() => {
    void loadClients();
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
        } as Database['public']['Tables']['clients']['Insert']);
      }

      setIsModalOpen(false);
      setFormData({ name: '', phone: '', address: '' });
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
      phone: client.phone,
      address: client.address,
    });
    setIsModalOpen(true);
  }

  function handleNew() {
    setEditingClient(null);
    setFormData({ name: '', phone: '', address: '' });
    setIsModalOpen(true);
  }

  async function handleDelete(id: string) {
    if (confirm(t('confirmDelete') || "Do'konni o'chirmoqchimisiz?")) {
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
      <main className="mx-auto w-full max-w-7xl p-4 sm:p-6 lg:p-8">
        <div className="mb-8 flex items-center justify-between gap-3">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('clients')}</h1>
          <Button onClick={handleNew} size="lg">
            {t('add')}
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {clients.length === 0 ? (
            <div className="col-span-full">
              <EmptyState
                icon="--"
                title={t('noData')}
                description="Hali do'konlar qo'shilmagan"
                action={<Button onClick={handleNew}>{t('addClient')}</Button>}
              />
            </div>
          ) : (
            clients.map((client: any) => (
              <Card key={client.id} className="flex flex-col gap-5">
                <div className="space-y-3">
                  <h3 className="text-lg font-bold text-gray-800 dark:text-white">{client.name}</h3>

                  <div className="space-y-1 text-sm text-gray-600 dark:text-gray-300">
                    <p>
                      <span className="font-semibold">Telefon:</span> {client.phone}
                    </p>
                    <p>
                      <span className="font-semibold">Manzil:</span> {client.address}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Link to={`/clients/${client.id}`} className="flex-1 min-w-[120px]">
                    <Button variant="secondary" className="w-full" size="sm">
                      Ko'rish
                    </Button>
                  </Link>
                  <Button variant="secondary" onClick={() => handleEdit(client)} size="sm">
                    Tahrirlash
                  </Button>
                  <Button variant="danger" onClick={() => handleDelete(client.id)} size="sm">
                    O'chirish
                  </Button>
                </div>
              </Card>
            ))
          )}
        </div>

        <Modal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setEditingClient(null);
          }}
          title={editingClient ? t('editClient') : t('addClient')}
          actions={
            <>
              <Button
                variant="secondary"
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingClient(null);
                }}
              >
                {t('cancel')}
              </Button>
              <Button onClick={handleSave}>{t('save')}</Button>
            </>
          }
        >
          <div className="space-y-4">
            <Input
              label={t('clientName')}
              value={formData.name}
              onChange={(event) => setFormData({ ...formData, name: event.target.value })}
              placeholder="Do'kon nomi"
            />
            <Input
              label={t('phone')}
              value={formData.phone}
              onChange={(event) => setFormData({ ...formData, phone: event.target.value })}
              placeholder="+998 90 000 00 00"
              type="tel"
            />
            <TextArea
              label={t('address')}
              value={formData.address}
              onChange={(event) => setFormData({ ...formData, address: event.target.value })}
              placeholder="Manzil"
              rows={3}
            />
          </div>
        </Modal>
      </main>
    </>
  );
}
