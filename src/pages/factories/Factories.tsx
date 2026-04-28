import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { Navigation } from '@/components/Navigation';
import { Button, Card, EmptyState, Input, Loading, Modal, TextArea } from '@/components/ui';
import { useApp } from '@/context/AppContext';
import type { Database } from '@/lib/database.types';
import {
  createFactory,
  deleteFactory,
  getFactories,
  updateFactory,
} from '@/lib/db-operations';

export default function FactoriesPage() {
  const { t, showToast } = useApp();
  const [factories, setFactories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFactory, setEditingFactory] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
  });

  useEffect(() => {
    void loadFactories();
  }, []);

  async function loadFactories() {
    try {
      setLoading(true);
      const data = await getFactories();
      setFactories(data || []);
    } catch (error) {
      console.error('Error loading factories:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    const currentFormData = { ...formData };
    const currentEditingFactory = editingFactory;
    const isEditing = Boolean(currentEditingFactory);

    setIsModalOpen(false);
    showToast({
      type: 'info',
      message: isEditing ? "Zavod yangilanmoqda..." : "Zavod qo'shilmoqda...",
      durationMs: 1600,
    });

    try {
      if (currentEditingFactory) {
        await updateFactory(currentEditingFactory.id, currentFormData);
      } else {
        await createFactory({
          id: uuidv4(),
          ...currentFormData,
          created_at: new Date().toISOString(),
        } as Database['public']['Tables']['factories']['Insert']);
      }

      await loadFactories();
      setEditingFactory((current: any) =>
        current?.id === currentEditingFactory?.id ? null : current
      );
      showToast({
        type: 'success',
        message: isEditing ? "Zavod yangilandi" : "Zavod qo'shildi",
      });
    } catch (error) {
      console.error('Error saving factory:', error);
      setEditingFactory(currentEditingFactory);
      setFormData(currentFormData);
      setIsModalOpen(true);
      showToast({
        type: 'error',
        message: "Zavodni saqlashda xato yuz berdi",
      });
    }
  }

  function handleEdit(factory: any) {
    setEditingFactory(factory);
    setFormData({
      name: factory.name,
      phone: factory.phone,
      address: factory.address,
    });
    setIsModalOpen(true);
  }

  function handleNew() {
    setEditingFactory(null);
    setFormData({ name: '', phone: '', address: '' });
    setIsModalOpen(true);
  }

  async function handleDelete(id: string) {
    if (confirm(t('confirmDelete') || "Zavodni o'chirmoqchimisiz?")) {
      try {
        await deleteFactory(id);
        await loadFactories();
        showToast({
          type: 'success',
          message: "Zavod o'chirildi",
        });
      } catch (error) {
        console.error('Error deleting factory:', error);
        showToast({
          type: 'error',
          message: "Zavodni o'chirishda xato yuz berdi",
        });
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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('factories')}</h1>
          <Button onClick={handleNew} size="lg">
            {t('add')}
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {factories.length === 0 ? (
            <div className="col-span-full">
              <EmptyState
                icon="--"
                title={t('noData')}
                description="Hali zavodlar qo'shilmagan"
                action={<Button onClick={handleNew}>{t('addFactory')}</Button>}
              />
            </div>
          ) : (
            factories.map((factory: any) => (
              <Card key={factory.id} className="flex flex-col gap-5">
                <div className="space-y-3">
                  <h3 className="text-lg font-bold text-gray-800 dark:text-white">
                    {factory.name}
                  </h3>

                  <div className="space-y-1 text-sm text-gray-600 dark:text-gray-300">
                    <p>
                      <span className="font-semibold">Telefon:</span> {factory.phone}
                    </p>
                    <p>
                      <span className="font-semibold">Manzil:</span> {factory.address}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Link to={`/factories/${factory.id}`} className="flex-1 min-w-[120px]">
                    <Button variant="secondary" size="sm" className="w-full">
                      Ko'rish
                    </Button>
                  </Link>
                  <Button
                    variant="secondary"
                    onClick={() => handleEdit(factory)}
                    size="sm"
                    className="min-w-[120px]"
                  >
                    Tahrirlash
                  </Button>
                  <Button
                    variant="danger"
                    onClick={() => handleDelete(factory.id)}
                    size="sm"
                    className="min-w-[120px]"
                  >
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
            setEditingFactory(null);
          }}
          title={editingFactory ? t('editFactory') : t('addFactory')}
          actions={
            <>
              <Button
                variant="secondary"
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingFactory(null);
                }}
                type="button"
              >
                {t('cancel')}
              </Button>
              <Button type="submit" form="factory-form">
                {t('save')}
              </Button>
            </>
          }
        >
          <form
            id="factory-form"
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              void handleSave();
            }}
          >
            <Input
              label={t('factoryName')}
              value={formData.name}
              onChange={(event) => setFormData({ ...formData, name: event.target.value })}
              placeholder="Zavod nomi"
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
          </form>
        </Modal>
      </main>
    </>
  );
}
