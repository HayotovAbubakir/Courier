import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { Navigation } from '@/components/Navigation';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ImageLightbox,
  Input,
  Loading,
  Modal,
  Select,
  TextArea,
} from '@/components/ui';
import { useApp } from '@/context/AppContext';
import {
  createDelivery,
  createDeliveryItem,
  deleteDeliveryWithRelations,
  getClients,
  getDeliveries,
  getFactories,
  uploadProductImage,
} from '@/lib/db-operations';
import {
  formatDecimalInput,
  formatIntegerInput,
  formatMoney,
  getDeliveryRouteLabel,
  getPaymentStatus,
  normalizeDecimalInput,
  normalizeIntegerInput,
  parseDecimalInput,
  parseIntegerInput,
  getRemainingBalance,
  getStatusBadgeVariant,
  getStatusLabel,
} from '@/lib/delivery-helpers';

interface DeliveryItem {
  product_name: string;
  quantity: number;
  quantity_input: string;
  unit: string;
  unit_price: number;
  unit_price_input: string;
  image_file: File | null;
  image_preview_url: string | null;
}

type DeliveryFilter = 'active' | 'history';

function createEmptyItem(): DeliveryItem {
  return {
    product_name: '',
    quantity: 1,
    quantity_input: '1',
    unit: 'kg',
    unit_price: 0,
    unit_price_input: '',
    image_file: null,
    image_preview_url: null,
  };
}

function cleanupItemPreviews(items: DeliveryItem[]) {
  items.forEach((item) => {
    if (item.image_preview_url?.startsWith('blob:')) {
      URL.revokeObjectURL(item.image_preview_url);
    }
  });
}

export default function DeliveriesPage() {
  const { t, showToast } = useApp();
  const [searchParams] = useSearchParams();
  const createInitialFormData = () => ({
    factory_id: searchParams.get('factory') || '',
    client_id: searchParams.get('client') || '',
    delivery_date: new Date().toISOString().split('T')[0],
    due_date: '',
    notes: '',
  });
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [factories, setFactories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingDeliveryId, setDeletingDeliveryId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<{ src: string; alt: string } | null>(null);
  const [deliveryFilter, setDeliveryFilter] = useState<DeliveryFilter>('active');
  const [formData, setFormData] = useState(createInitialFormData);
  const [items, setItems] = useState<DeliveryItem[]>([createEmptyItem()]);
  const itemsRef = useRef(items);

  useEffect(() => {
    void loadData();
  }, []);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => {
    return () => {
      cleanupItemPreviews(itemsRef.current);
    };
  }, []);

  const activeDeliveries = useMemo(
    () =>
      deliveries.filter(
        (delivery) => getPaymentStatus(delivery.total_amount, delivery.paid_amount) !== 'paid'
      ),
    [deliveries]
  );
  const historyDeliveries = useMemo(
    () =>
      deliveries.filter(
        (delivery) => getPaymentStatus(delivery.total_amount, delivery.paid_amount) === 'paid'
      ),
    [deliveries]
  );

  async function loadData() {
    try {
      setLoading(true);
      const [deliveriesData, clientsData, factoriesData] = await Promise.all([
        getDeliveries(),
        getClients(),
        getFactories(),
      ]);
      setDeliveries(deliveriesData || []);
      setClients(clientsData || []);
      setFactories(factoriesData || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!formData.factory_id) {
      showToast({
        type: 'warning',
        message: 'Zavod tanlang',
      });
      return;
    }

    if (!formData.client_id) {
      showToast({
        type: 'warning',
        message: "Do'kon tanlang",
      });
      return;
    }

    if (items.some((item) => !item.product_name || item.quantity <= 0 || item.unit_price < 0)) {
      showToast({
        type: 'warning',
        message: "Barcha mahsulotlarni to'liq to'ldiring",
      });
      return;
    }

    const currentFormData = { ...formData };
    const currentItems = items.map((item) => ({ ...item }));
    const totalAmount = currentItems.reduce(
      (sum, item) => sum + item.quantity * item.unit_price,
      0
    );
    const deliveryId = uuidv4();

    setIsModalOpen(false);
    showToast({
      type: 'info',
      message: "Yetkazib berish saqlanmoqda...",
      durationMs: 1800,
    });

    try {
      await createDelivery({
        id: deliveryId,
        factory_id: currentFormData.factory_id,
        client_id: currentFormData.client_id,
        delivery_date: currentFormData.delivery_date,
        due_date: currentFormData.due_date || null,
        total_amount: totalAmount,
        paid_amount: 0,
        status: 'unpaid',
        notes: currentFormData.notes || null,
      });

      for (const item of currentItems) {
        const itemId = uuidv4();
        const productImageUrl = item.image_file
          ? await uploadProductImage(item.image_file, deliveryId, itemId)
          : null;

        await createDeliveryItem({
          id: itemId,
          delivery_id: deliveryId,
          product_name: item.product_name,
          product_image_url: productImageUrl,
          quantity: item.quantity,
          unit: item.unit,
          unit_price: item.unit_price,
          total_price: item.quantity * item.unit_price,
        });
      }

      setDeliveryFilter('active');
      await loadData();
      showToast({
        type: 'success',
        message: "Yetkazib berish qo'shildi",
      });
    } catch (error) {
      console.error('Error saving delivery:', error);
      setFormData(currentFormData);
      setItems(currentItems);
      setIsModalOpen(true);
      showToast({
        type: 'error',
        message: "Yetkazib berishni saqlashda xato yuz berdi",
      });
    }
  }

  async function handleDeleteDelivery(deliveryId: string) {
    if (!window.confirm("O'chirishni tasdiqlaysizmi?")) {
      return;
    }

    try {
      setDeletingDeliveryId(deliveryId);
      await deleteDeliveryWithRelations(deliveryId);
      await loadData();
      showToast({
        type: 'success',
        message: "Yetkazib berish o'chirildi",
      });
    } catch (error) {
      console.error('Error deleting delivery:', error);
      showToast({
        type: 'error',
        message: "Yetkazib berishni o'chirishda xato yuz berdi",
      });
    } finally {
      setDeletingDeliveryId(null);
    }
  }

  function resetFormState() {
    cleanupItemPreviews(itemsRef.current);
    setFormData(createInitialFormData());
    setItems([createEmptyItem()]);
  }

  function openCreateModal() {
    resetFormState();
    setIsModalOpen(true);
  }

  function closeCreateModal() {
    setIsModalOpen(false);
  }

  function handleImageChange(index: number, file: File | null) {
    setItems((currentItems) => {
      const nextItems = [...currentItems];
      const currentItem = nextItems[index];

      if (currentItem.image_preview_url?.startsWith('blob:')) {
        URL.revokeObjectURL(currentItem.image_preview_url);
      }

      nextItems[index] = {
        ...currentItem,
        image_file: file,
        image_preview_url: file ? URL.createObjectURL(file) : null,
      };

      return nextItems;
    });
  }

  function handleRemoveItem(index: number) {
    setItems((currentItems) => {
      const nextItems = [...currentItems];
      const [removedItem] = nextItems.splice(index, 1);

      if (removedItem?.image_preview_url?.startsWith('blob:')) {
        URL.revokeObjectURL(removedItem.image_preview_url);
      }

      return nextItems;
    });
  }

  if (loading) {
    return (
      <>
        <Navigation />
        <Loading message={t('loading')} />
      </>
    );
  }

  const selectedFactoryName =
    factories.find((factory) => factory.id === formData.factory_id)?.name || 'Zavod tanlang';
  const selectedClientName =
    clients.find((client) => client.id === formData.client_id)?.name || "Do'kon tanlang";
  const visibleDeliveries = deliveryFilter === 'active' ? activeDeliveries : historyDeliveries;
  const emptyTitle =
    deliveryFilter === 'active' ? "Faol yetkazib berish yo'q" : "Tarix bo'sh";
  const emptyDescription =
    deliveryFilter === 'active'
      ? "Hozircha to'lanmagan yoki qisman to'langan yetkazib berishlar yo'q"
      : "To'langan yetkazib berishlar hali mavjud emas";

  return (
    <>
      <Navigation />
      <main className="mx-auto w-full max-w-7xl p-4 sm:p-6 lg:p-8">
        <div className="mb-8 flex items-center justify-between gap-3">
          <div className="space-y-3">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('deliveries')}</h1>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={deliveryFilter === 'active' ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setDeliveryFilter('active')}
              >
                Faol ({activeDeliveries.length})
              </Button>
              <Button
                variant={deliveryFilter === 'history' ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setDeliveryFilter('history')}
              >
                Tarix ({historyDeliveries.length})
              </Button>
            </div>
          </div>
          <Button onClick={openCreateModal} size="lg">
            {t('add')}
          </Button>
        </div>

        <div className="space-y-4">
          {visibleDeliveries.length === 0 ? (
            <EmptyState
              icon="--"
              title={emptyTitle}
              description={emptyDescription}
              action={
                deliveryFilter === 'active' ? (
                  <Button onClick={openCreateModal}>{t('addDelivery')}</Button>
                ) : undefined
              }
            />
          ) : (
            visibleDeliveries.map((delivery: any) => {
              const deliveryStatus = getPaymentStatus(delivery.total_amount, delivery.paid_amount);
              const remainingBalance = getRemainingBalance(
                delivery.total_amount,
                delivery.paid_amount
              );

              return (
                <Card key={delivery.id} className="transition-shadow hover:shadow-lg">
                {delivery.delivery_items?.[0] && (
                  <div className="mb-4 flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--card-soft)] p-3">
                    {delivery.delivery_items[0].product_image_url ? (
                      <button
                        type="button"
                        onClick={() =>
                          setLightboxImage({
                            src: delivery.delivery_items[0].product_image_url,
                            alt: delivery.delivery_items[0].product_name,
                          })
                        }
                        className="shrink-0 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        aria-label={`${delivery.delivery_items[0].product_name} rasmini kattalashtirish`}
                      >
                        <img
                          src={delivery.delivery_items[0].product_image_url}
                          alt={delivery.delivery_items[0].product_name}
                          className="h-14 w-14 cursor-zoom-in rounded-lg object-cover transition-opacity hover:opacity-90"
                        />
                      </button>
                    ) : (
                      <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-[var(--card)] text-xs text-gray-600 dark:text-slate-400">
                        Rasm yo'q
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-gray-800 dark:text-white">
                        {delivery.delivery_items[0].product_name}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        {delivery.delivery_items.length > 1
                          ? `+${delivery.delivery_items.length - 1} ta qo'shimcha mahsulot`
                          : '1 ta mahsulot'}
                      </p>
                    </div>
                  </div>
                )}

                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <p className="mb-1 text-sm font-medium text-gray-600 dark:text-gray-300">
                      {getDeliveryRouteLabel(delivery.factories?.name, delivery.clients?.name)}
                    </p>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">
                      {new Date(delivery.delivery_date).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={getStatusBadgeVariant(deliveryStatus)}>
                      {getStatusLabel(deliveryStatus)}
                    </Badge>
                    <button
                      type="button"
                      onClick={() => handleDeleteDelivery(delivery.id)}
                      disabled={deletingDeliveryId === delivery.id}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-red-200 bg-red-50 text-red-600 transition-colors hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-300 dark:hover:bg-red-500/20"
                      aria-label="Yetkazib berishni o'chirish"
                      title="O'chirish"
                    >
                      <TrashIcon />
                    </button>
                  </div>
                </div>

                <div className="mb-4 grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500 dark:text-gray-300">
                      {deliveryFilter === 'history' ? 'Jami summa' : 'Jami'}
                    </p>
                    <p className="text-lg font-bold text-gray-800 dark:text-white">
                      {formatMoney(delivery.total_amount)}
                    </p>
                  </div>
                  {deliveryFilter === 'active' ? (
                    <>
                      <div>
                        <p className="text-gray-500 dark:text-gray-300">To'langan</p>
                        <p className="text-lg font-bold text-green-600 dark:text-green-300">
                          {formatMoney(delivery.paid_amount || 0)}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500 dark:text-gray-300">Qolgan</p>
                        <p
                          className={`text-lg font-bold ${
                            remainingBalance > 0
                              ? 'text-red-600 dark:text-red-300'
                              : 'text-green-600 dark:text-green-300'
                          }`}
                        >
                          {formatMoney(remainingBalance)}
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <p className="text-gray-600 dark:text-gray-300">Zavod</p>
                        <p className="text-lg font-bold text-gray-800 dark:text-white">
                          {delivery.factories?.name || 'Zavod tanlanmagan'}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600 dark:text-gray-300">Do'kon</p>
                        <p className="text-lg font-bold text-gray-800 dark:text-white">
                          {delivery.clients?.name || "Do'kon tanlanmagan"}
                        </p>
                      </div>
                    </>
                  )}
                </div>

                {deliveryFilter === 'history' && delivery.delivery_items?.length > 0 && (
                  <div className="mb-4 rounded-xl border border-[var(--border)] bg-[var(--card-soft)] p-4">
                    <p className="mb-3 text-sm font-medium text-gray-600 dark:text-gray-300">
                      Mahsulotlar
                    </p>
                    <div className="space-y-2">
                      {delivery.delivery_items.map((item: any) => (
                        <div
                          key={item.id}
                          className="flex items-start justify-between gap-3 rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2"
                        >
                          <div>
                            <p className="font-medium text-gray-800 dark:text-white">
                              {item.product_name}
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-300">
                              {item.quantity} {item.unit}
                            </p>
                          </div>
                          <p className="font-semibold text-gray-800 dark:text-white">
                            {formatMoney(item.total_price)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {deliveryFilter === 'active' && delivery.due_date && (
                  <p className="mb-4 text-sm text-gray-600 dark:text-gray-300">
                    Muddati: {new Date(delivery.due_date).toLocaleDateString()}
                  </p>
                )}

                <Link to={`/deliveries/${delivery.id}`}>
                  <Button variant="secondary" className="w-full">
                    Ko'rish
                  </Button>
                </Link>
                </Card>
              );
            })
          )}
        </div>

        <Modal
          isOpen={isModalOpen}
          onClose={closeCreateModal}
          title={t('addDelivery')}
          actions={
            <>
              <Button variant="secondary" onClick={closeCreateModal} type="button">
                {t('cancel')}
              </Button>
              <Button type="submit" form="delivery-create-form">
                {t('save')}
              </Button>
            </>
          }
        >
          <form
            id="delivery-create-form"
            className="max-h-96 space-y-6 overflow-y-auto"
            onSubmit={(event) => {
              event.preventDefault();
              void handleSave();
            }}
          >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Select
                label="Zavod"
                value={formData.factory_id}
                onChange={(event) => setFormData({ ...formData, factory_id: event.target.value })}
                options={factories.map((factory) => ({ value: factory.id, label: factory.name }))}
              />
              <Select
                label="Do'kon"
                value={formData.client_id}
                onChange={(event) => setFormData({ ...formData, client_id: event.target.value })}
                options={clients.map((client) => ({ value: client.id, label: client.name }))}
              />
            </div>

            <div className="rounded-xl border border-[var(--border)] bg-[var(--card-soft)] p-4">
              <p className="mb-1 text-sm text-gray-600 dark:text-gray-300">Yo'nalish</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">
                {getDeliveryRouteLabel(selectedFactoryName, selectedClientName)}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                label={t('deliveryDate')}
                type="date"
                value={formData.delivery_date}
                onChange={(event) => setFormData({ ...formData, delivery_date: event.target.value })}
              />

              <Input
                label={t('dueDate')}
                type="date"
                value={formData.due_date}
                onChange={(event) => setFormData({ ...formData, due_date: event.target.value })}
              />
            </div>

            <div className="border-t border-gray-200 pt-4 dark:border-[#334155]">
              <h3 className="mb-4 font-bold text-gray-900 dark:text-white">{t('products')}</h3>
              <div className="space-y-4">
                {items.map((item, index) => (
                  <div
                    key={index}
                    className="rounded-xl border border-gray-200 bg-slate-50 p-4 dark:border-[#334155] dark:bg-slate-900/40"
                  >
                    <div className="mb-4">
                      <label className="mb-2 block text-sm font-medium text-gray-600 dark:text-gray-200">
                        Mahsulot rasmi
                      </label>
                      <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-white px-4 py-6 text-center transition-colors hover:border-blue-400 hover:bg-blue-50 dark:border-[#334155] dark:bg-slate-950/40 dark:hover:border-blue-400 dark:hover:bg-slate-800/60">
                        {item.image_preview_url ? (
                          <img
                            src={item.image_preview_url}
                            alt={item.product_name || "Rasm ko'rinishi"}
                            className="mb-3 h-32 w-full max-w-48 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="mb-3 flex h-24 w-full max-w-48 items-center justify-center rounded-lg bg-slate-100 text-sm text-gray-500 dark:bg-slate-800 dark:text-slate-400">
                            Rasm preview
                          </div>
                        )}
                        <span className="text-sm font-medium text-gray-800 dark:text-white">
                          Rasm tanlash yoki shu yerga tashlash
                        </span>
                        <span className="mt-1 text-xs text-gray-500 dark:text-slate-400">
                          JPG, PNG, WEBP va boshqa image/* formatlar
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          className="sr-only"
                          onChange={(event) =>
                            handleImageChange(index, event.target.files?.[0] ?? null)
                          }
                        />
                      </label>
                      {item.image_preview_url && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="mt-2"
                          onClick={() => handleImageChange(index, null)}
                        >
                          Rasmni olib tashlash
                        </Button>
                      )}
                    </div>

                    <Input
                      label={t('productName')}
                      value={item.product_name}
                      onChange={(event) => {
                        const newItems = [...items];
                        newItems[index].product_name = event.target.value;
                        setItems(newItems);
                      }}
                      placeholder="Mahsulot nomi"
                    />

                    <div className="mt-3 grid grid-cols-3 gap-2">
                      <Input
                        label={t('quantity')}
                        type="text"
                        inputMode="decimal"
                        value={formatDecimalInput(item.quantity_input)}
                        onChange={(event) => {
                          const newItems = [...items];
                          const normalizedValue = normalizeDecimalInput(event.target.value);
                          newItems[index].quantity_input = normalizedValue;
                          newItems[index].quantity = parseDecimalInput(normalizedValue);
                          setItems(newItems);
                        }}
                      />
                      <Select
                        label={t('unit')}
                        value={item.unit}
                        placeholder={null}
                        onChange={(event) => {
                          const newItems = [...items];
                          newItems[index].unit = event.target.value;
                          setItems(newItems);
                        }}
                        options={[
                          { value: 'dona', label: 'dona' },
                          { value: 'kg', label: 'kg' },
                          { value: 'litr', label: 'litr' },
                        ]}
                      />
                      <Input
                        label="Narxi"
                        type="text"
                        inputMode="numeric"
                        value={formatIntegerInput(item.unit_price_input)}
                        onChange={(event) => {
                          const newItems = [...items];
                          const normalizedValue = normalizeIntegerInput(event.target.value);
                          newItems[index].unit_price_input = normalizedValue;
                          newItems[index].unit_price = parseIntegerInput(normalizedValue);
                          setItems(newItems);
                        }}
                      />
                    </div>

                    {items.length > 1 && (
                      <Button
                        variant="danger"
                        size="sm"
                        className="mt-3 w-full"
                        onClick={() => handleRemoveItem(index)}
                      >
                        O'chirish
                      </Button>
                    )}
                  </div>
                ))}
              </div>

              <Button
                variant="secondary"
                className="mt-4 w-full"
                onClick={() => setItems([...items, createEmptyItem()])}
              >
                Mahsulot qo'shish
              </Button>
            </div>

            <TextArea
              label="Izohlar"
              value={formData.notes}
              onChange={(event) => setFormData({ ...formData, notes: event.target.value })}
              placeholder="Qo'shimcha izohlar"
              rows={2}
            />

            <div className="rounded-xl border border-gray-200 bg-slate-50 p-4 font-bold text-gray-900 dark:border-[#334155] dark:bg-slate-900/40 dark:text-white">
              Jami: {formatMoney(items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0))}
            </div>
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

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current" strokeWidth="2">
      <path d="M4 7h16" />
      <path d="M10 11v6M14 11v6" />
      <path d="M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12" />
      <path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  );
}
