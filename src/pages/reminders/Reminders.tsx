import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Navigation } from '@/components/Navigation';
import { Badge, Button, Card, EmptyState, Loading } from '@/components/ui';
import { useApp } from '@/context/AppContext';
import { getReminders } from '@/lib/db-operations';
import { formatMoney, getRemainingBalance } from '@/lib/delivery-helpers';

type Reminder = {
  id: string;
  client_id: string;
  total_amount: number;
  paid_amount: number | null;
  due_date: string | null;
  isOverdue: boolean;
  daysOverdue: number;
  clients?: {
    name?: string | null;
  } | null;
  delivery_items?: Array<{
    product_name?: string | null;
  }>;
};

export default function RemindersPage() {
  const { t } = useApp();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadReminders() {
      try {
        setLoading(true);
        const data = await getReminders();
        setReminders((data ?? []) as Reminder[]);
      } catch (error) {
        console.error('Error loading reminders:', error);
      } finally {
        setLoading(false);
      }
    }

    void loadReminders();
  }, []);

  if (loading) {
    return (
      <>
        <Navigation />
        <Loading message={t('loading')} />
      </>
    );
  }

  const overdueReminders = reminders.filter((reminder) => reminder.isOverdue);

  return (
    <>
      <Navigation />
      <main className="mx-auto w-full max-w-7xl p-4 sm:p-6 lg:p-8">
        <h1 className="mb-8 text-3xl font-bold text-gray-900 dark:text-white">{t('reminders')}</h1>

        <section className="mb-8">
          <h2 className="mb-4 text-2xl font-bold text-red-600 dark:text-red-300">
            {t('overdue_payments')}
          </h2>

          {overdueReminders.length === 0 ? (
            <Card>
              <p className="text-center font-medium text-green-700 dark:text-green-300">
                Muddati o'tgan to'lovlar yo'q.
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {overdueReminders.map((reminder) => (
                <ReminderCard key={reminder.id} reminder={reminder} />
              ))}
            </div>
          )}
        </section>

        {overdueReminders.length === 0 && (
          <section>
            <EmptyState
              icon="--"
              title="To'lovlar yo'q"
              description="Hozircha muddati o'tgan eslatmalar mavjud emas."
            />
          </section>
        )}
      </main>
    </>
  );
}

function ReminderCard({ reminder }: { reminder: Reminder }) {
  const balance = getRemainingBalance(reminder.total_amount, reminder.paid_amount);
  const product = reminder.delivery_items?.[0];

  return (
    <Card className="border-red-200 bg-red-50 dark:border-red-500/30 dark:bg-red-500/10">
      <h3 className="mb-1 text-lg font-bold text-gray-800 dark:text-white">
        {reminder.clients?.name ?? "Noma'lum do'kon"}
      </h3>
      <p className="mb-3 text-sm text-gray-600 dark:text-gray-300">
        {product?.product_name ?? 'Mahsulot'}
      </p>

      <p className="text-sm text-gray-600 dark:text-gray-300">Qolgan qarz</p>
      <p className="mb-4 text-2xl font-bold text-red-600 dark:text-red-300">
        {formatMoney(balance)}
      </p>

      <div className="mb-4">
        <Badge variant="danger">{reminder.daysOverdue} kun muddati o'tgan</Badge>
      </div>

      <div className="flex gap-2">
        <Link to={`/deliveries/${reminder.id}`} className="flex-1">
          <Button variant="secondary" size="sm" className="w-full">
            Batafsil
          </Button>
        </Link>
        <Link to={`/clients/${reminder.client_id}`} className="flex-1">
          <Button size="sm" className="w-full">
            Do'kon
          </Button>
        </Link>
      </div>
    </Card>
  );
}
