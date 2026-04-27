import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge, Button, EmptyState, Input, Modal, TextArea } from '@/components/ui';
import { deleteDeliveryWithRelations, updateDeliveryWithItems } from '@/lib/db-operations';
import {
  formatDecimalInput,
  formatIntegerInput,
  formatMoney,
  getDeliveryRouteLabel,
  getPaymentStatus,
  getRemainingBalance,
  getStatusBadgeVariant,
  getStatusLabel,
  normalizeDecimalInput,
  normalizeIntegerInput,
  parseDecimalInput,
  parseIntegerInput,
} from '@/lib/delivery-helpers';

type DeliveryRecord = {
  id: string;
  delivery_date: string;
  due_date: string | null;
  total_amount: number;
  paid_amount: number;
  status: 'unpaid' | 'partially_paid' | 'paid';
  notes: string | null;
  clients?: { name?: string | null } | null;
  factories?: { name?: string | null } | null;
  delivery_items?: Array<{
    id: string;
    product_name: string;
    quantity: number;
    unit: string;
    unit_price: number;
    total_price: number;
  }>;
};

interface DeliveryHistorySectionProps {
  deliveries: DeliveryRecord[];
  emptyDescription: string;
  addDeliveryLink?: string;
  addDeliveryLabel?: string;
  onUpdated: () => Promise<void> | void;
  onPayment?: (delivery: DeliveryRecord) => void;
}

type FilterMode = 'active' | 'history';

export function DeliveryHistorySection({
  deliveries,
  emptyDescription,
  addDeliveryLink,
  addDeliveryLabel = 'Yangi yetkazib berish',
  onUpdated,
  onPayment,
}: DeliveryHistorySectionProps) {
  const [filterMode, setFilterMode] = useState<FilterMode>('active');
  const [editingDelivery, setEditingDelivery] = useState<DeliveryRecord | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingDeliveryId, setDeletingDeliveryId] = useState<string | null>(null);

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

  useEffect(() => {
    if (filterMode === 'active' && activeDeliveries.length === 0 && historyDeliveries.length > 0) {
      setFilterMode('history');
    }

    if (filterMode === 'history' && historyDeliveries.length === 0 && activeDeliveries.length > 0) {
      setFilterMode('active');
    }
  }, [activeDeliveries.length, filterMode, historyDeliveries.length]);

  const filteredDeliveries = filterMode === 'active' ? activeDeliveries : historyDeliveries;

  async function handleSaveDelivery(updatedDelivery: {
    due_date: string | null;
    notes: string | null;
    items: Array<{
      id: string;
      product_name: string;
      quantity: number;
      unit: string;
      unit_price: number;
    }>;
  }) {
    if (!editingDelivery) return;

    try {
      setIsSaving(true);
      await updateDeliveryWithItems(
        editingDelivery.id,
        {
          due_date: updatedDelivery.due_date,
          notes: updatedDelivery.notes,
        },
        updatedDelivery.items
      );
      setEditingDelivery(null);
      await onUpdated();
    } catch (error) {
      console.error('Error updating delivery:', error);
      alert("Yetkazib berishni yangilashda xato yuz berdi");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteDelivery(deliveryId: string) {
    if (!window.confirm("Yetkazib berishni o'chirishni tasdiqlaysizmi?")) {
      return;
    }

    try {
      setDeletingDeliveryId(deliveryId);
      await deleteDeliveryWithRelations(deliveryId);
      await onUpdated();
    } catch (error) {
      console.error('Error deleting delivery:', error);
      alert("Yetkazib berishni o'chirishda xato yuz berdi");
    } finally {
      setDeletingDeliveryId(null);
    }
  }

  return (
    <>
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap gap-2">
          <Button
            variant={filterMode === 'active' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setFilterMode('active')}
          >
            Faol ({activeDeliveries.length})
          </Button>
          <Button
            variant={filterMode === 'history' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setFilterMode('history')}
          >
            Tarix ({historyDeliveries.length})
          </Button>
        </div>

        {addDeliveryLink && (
          <Link to={addDeliveryLink}>
            <Button variant="secondary">{addDeliveryLabel}</Button>
          </Link>
        )}
      </div>

      {filteredDeliveries.length === 0 ? (
        <EmptyState
          icon="--"
          title={filterMode === 'active' ? "Faol yetkazib berish yo'q" : "Tarix bo'sh"}
          description={emptyDescription}
        />
      ) : (
        <div className="space-y-4">
          {filteredDeliveries.map((delivery) => {
            const remainingBalance = getRemainingBalance(
              delivery.total_amount,
              delivery.paid_amount || 0
            );
            const deliveryStatus = getPaymentStatus(delivery.total_amount, delivery.paid_amount || 0);

            return (
              <div
                key={delivery.id}
                className="rounded-xl border border-[var(--border)] bg-[var(--card-soft)] p-4 transition-colors"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="font-semibold text-gray-800 dark:text-white">
                      {new Date(delivery.delivery_date).toLocaleDateString()}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      {getDeliveryRouteLabel(delivery.factories?.name, delivery.clients?.name)}
                    </p>
                    {delivery.due_date && (
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        Muddati: {new Date(delivery.due_date).toLocaleDateString()}
                      </p>
                    )}
                  </div>

                  <Badge variant={getStatusBadgeVariant(deliveryStatus)}>
                    {getStatusLabel(deliveryStatus)}
                  </Badge>
                </div>

                <div className="mt-4 space-y-2">
                  {delivery.delivery_items?.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-start justify-between gap-3 rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2"
                    >
                      <div>
                        <p className="font-medium text-gray-800 dark:text-white">
                          {item.product_name}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                          {item.quantity} {item.unit} x {formatMoney(item.unit_price)}
                        </p>
                      </div>
                      <p className="font-semibold text-gray-800 dark:text-white">
                        {formatMoney(item.total_price)}
                      </p>
                    </div>
                  ))}
                </div>

                {delivery.notes && (
                  <p className="mt-4 text-sm text-gray-600 dark:text-gray-300">
                    <span className="font-semibold text-gray-800 dark:text-white">Izoh:</span>{' '}
                    {delivery.notes}
                  </p>
                )}

                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <SummaryStat label="Jami" value={formatMoney(delivery.total_amount)} />
                  <SummaryStat
                    label="To'langan"
                    value={formatMoney(delivery.paid_amount || 0)}
                    valueClassName="text-green-600 dark:text-green-300"
                  />
                  <SummaryStat
                    label="Qolgan"
                    value={formatMoney(remainingBalance)}
                    valueClassName={
                      remainingBalance > 0
                        ? 'text-red-600 dark:text-red-300'
                        : 'text-green-600 dark:text-green-300'
                    }
                  />
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Link to={`/deliveries/${delivery.id}`}>
                    <Button variant="secondary" size="sm">
                      Ko'rish
                    </Button>
                  </Link>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setEditingDelivery(delivery)}
                  >
                    Tahrirlash
                  </Button>
                  {onPayment && deliveryStatus !== 'paid' && (
                    <Button size="sm" onClick={() => onPayment(delivery)}>
                      To'lov
                    </Button>
                  )}
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => handleDeleteDelivery(delivery.id)}
                    disabled={deletingDeliveryId === delivery.id}
                  >
                    {deletingDeliveryId === delivery.id ? "O'chirilmoqda..." : "O'chirish"}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <DeliveryEditModal
        delivery={editingDelivery}
        isOpen={Boolean(editingDelivery)}
        isSaving={isSaving}
        onClose={() => {
          if (!isSaving) {
            setEditingDelivery(null);
          }
        }}
        onSave={handleSaveDelivery}
      />
    </>
  );
}

function SummaryStat({
  label,
  value,
  valueClassName = 'text-gray-900 dark:text-white',
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-3">
      <p className="text-sm text-gray-500 dark:text-gray-300">{label}</p>
      <p className={`text-lg font-bold ${valueClassName}`}>{value}</p>
    </div>
  );
}

function DeliveryEditModal({
  delivery,
  isOpen,
  isSaving,
  onClose,
  onSave,
}: {
  delivery: DeliveryRecord | null;
  isOpen: boolean;
  isSaving: boolean;
  onClose: () => void;
  onSave: (delivery: {
    due_date: string | null;
    notes: string | null;
    items: Array<{
      id: string;
      product_name: string;
      quantity: number;
      unit: string;
      unit_price: number;
    }>;
  }) => Promise<void>;
}) {
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<
    Array<{
      id: string;
      product_name: string;
      quantity: number;
      quantity_input: string;
      unit: string;
      unit_price: number;
      unit_price_input: string;
    }>
  >([]);

  useEffect(() => {
    if (!delivery || !isOpen) return;

    setDueDate(delivery.due_date || '');
    setNotes(delivery.notes || '');
    setItems(
      (delivery.delivery_items || []).map((item) => ({
        id: item.id,
        product_name: item.product_name,
        quantity: item.quantity,
        quantity_input: String(item.quantity),
        unit: item.unit,
        unit_price: item.unit_price,
        unit_price_input: String(item.unit_price),
      }))
    );
  }, [delivery, isOpen]);

  if (!delivery) return null;

  async function handleSubmit() {
    if (
      items.some(
        (item) =>
          !item.product_name.trim() || Number.isNaN(item.quantity) || item.quantity <= 0 || item.unit_price < 0
      )
    ) {
      alert("Mahsulot nomi, miqdori va narxini to'g'ri kiriting");
      return;
    }

    await onSave({
      due_date: dueDate || null,
      notes: notes || null,
      items: items.map(({ id, product_name, quantity, unit, unit_price }) => ({
        id,
        product_name,
        quantity,
        unit,
        unit_price,
      })),
    });
  }

  const nextTotal = items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Yetkazib berishni tahrirlash"
      actions={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isSaving}>
            Bekor qilish
          </Button>
          <Button onClick={handleSubmit} loading={isSaving}>
            Saqlash
          </Button>
        </>
      }
    >
      <div className="max-h-[70vh] space-y-4 overflow-y-auto">
        <Input
          label="To'lov muddati"
          type="date"
          value={dueDate}
          onChange={(event) => setDueDate(event.target.value)}
        />

        <div className="space-y-3">
          {items.map((item, index) => (
            <div
              key={item.id}
              className="rounded-xl border border-[var(--border)] bg-[var(--card-soft)] p-4"
            >
              <Input
                label="Mahsulot nomi"
                value={item.product_name}
                onChange={(event) => {
                  const nextItems = [...items];
                  nextItems[index].product_name = event.target.value;
                  setItems(nextItems);
                }}
              />

              <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
                <Input
                  label="Miqdori"
                  type="text"
                  inputMode="decimal"
                  value={formatDecimalInput(item.quantity_input)}
                  onChange={(event) => {
                    const nextItems = [...items];
                    const normalizedValue = normalizeDecimalInput(event.target.value);
                    nextItems[index].quantity_input = normalizedValue;
                    nextItems[index].quantity = parseDecimalInput(normalizedValue);
                    setItems(nextItems);
                  }}
                />

                <div>
                  <p className="mb-1 block text-sm font-medium text-gray-600 dark:text-gray-300">Birligi</p>
                  <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] px-4 py-2 text-gray-900 dark:text-[var(--text)]">
                    {item.unit}
                  </div>
                </div>

                <Input
                  label="Narxi"
                  type="text"
                  inputMode="numeric"
                  value={formatIntegerInput(item.unit_price_input)}
                  onChange={(event) => {
                    const nextItems = [...items];
                    const normalizedValue = normalizeIntegerInput(event.target.value);
                    nextItems[index].unit_price_input = normalizedValue;
                    nextItems[index].unit_price = parseIntegerInput(normalizedValue);
                    setItems(nextItems);
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        <TextArea
          label="Izohlar"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          rows={3}
        />

        <div className="rounded-xl border border-[var(--border)] bg-[var(--card-soft)] p-4">
          <p className="text-sm text-gray-500 dark:text-gray-300">Yangi jami summa</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {formatMoney(nextTotal)}
          </p>
        </div>
      </div>
    </Modal>
  );
}
