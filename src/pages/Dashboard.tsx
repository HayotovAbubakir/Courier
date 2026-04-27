import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Navigation } from '@/components/Navigation';
import { Badge, Button, Card, Loading } from '@/components/ui';
import { useApp } from '@/context/AppContext';
import { getDashboardStats, getReminders } from '@/lib/db-operations';
import { getRemainingBalance } from '@/lib/delivery-helpers';

function formatMoney(amount: number) {
  return `${Math.round(amount).toLocaleString()} so'm`;
}

export default function Dashboard() {
  const { t } = useApp();
  const [stats, setStats] = useState<any>(null);
  const [reminders, setReminders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [dashboardStats, remindersData] = await Promise.all([
          getDashboardStats(),
          getReminders(),
        ]);
        setStats(dashboardStats);
        setReminders(remindersData || []);
      } catch (error) {
        console.error('Error loading dashboard:', error);
      } finally {
        setLoading(false);
      }
    }

    void loadData();
  }, []);

  if (loading) {
    return (
      <>
        <Navigation />
        <Loading message={t('loading')} />
      </>
    );
  }

  const overdueReminders = reminders.slice(0, 3);

  return (
    <>
      <Navigation />
      <main className="mx-auto w-full max-w-7xl p-4 sm:p-6 lg:p-8">
        <h1 className="light-text-strong mb-8 text-3xl font-bold text-gray-900 dark:text-white">
          {t('dashboard')}
        </h1>

        {stats && (
          <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <p className="light-text-body mb-2 text-sm text-gray-700 dark:text-gray-300">
                {t('totalReceivables')}
              </p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                {formatMoney(stats.totalReceivables)}
              </p>
            </Card>

            <Card>
              <p className="light-text-body mb-2 text-sm text-gray-700 dark:text-gray-300">
                Yetkazib berilgan summa
              </p>
              <p className="text-3xl font-bold text-green-600 dark:text-green-300">
                {formatMoney(stats.totalPaid)}
              </p>
            </Card>

            <Card>
              <p className="light-text-body mb-2 text-sm text-gray-700 dark:text-gray-300">
                {t('overdueAmount')}
              </p>
              <p className="text-3xl font-bold text-red-600 dark:text-red-300">
                {formatMoney(stats.totalOverdue)}
              </p>
            </Card>

            <Card>
              <p className="light-text-body mb-2 text-sm text-gray-700 dark:text-gray-300">
                {t('thisWeekPayments')}
              </p>
              <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-300">
                {formatMoney(stats.thisWeekPayments)}
              </p>
            </Card>
          </div>
        )}

        <section>
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-2xl font-bold text-red-700 dark:text-red-300">
              Muddati o'tgan to'lovlar
            </h2>
            <Link to="/reminders">
              <Button variant="ghost">Barchasi</Button>
            </Link>
          </div>

          {overdueReminders.length === 0 ? (
            <Card>
              <p className="light-text-card text-center text-gray-800 dark:text-gray-300">
                Muddati o'tgan to'lovlar yo'q
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {overdueReminders.map((reminder: any) => (
                <Card
                  key={reminder.id}
                  className="border-red-200 bg-red-50 dark:border-red-500/30 dark:bg-red-500/10"
                >
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <h3 className="light-text-card font-bold text-gray-800 dark:text-white">
                      {reminder.clients?.name}
                    </h3>
                    <Badge variant="danger">
                      {reminder.daysOverdue} {t('days_overdue')}
                    </Badge>
                  </div>

                  <p className="light-text-body mb-2 text-sm text-gray-700 dark:text-gray-300">
                    Mahsulot: {reminder.delivery_items?.[0]?.product_name || 'Mahsulot'}
                  </p>
                  <p className="light-text-body mb-2 text-sm text-gray-700 dark:text-gray-300">
                    Jami: {formatMoney(getRemainingBalance(reminder.total_amount, reminder.paid_amount))}
                  </p>
                  <p className="light-text-muted text-xs text-gray-700 dark:text-gray-400">
                    Muddati:{' '}
                    {reminder.due_date
                      ? new Date(reminder.due_date).toLocaleDateString()
                      : 'Belgilanmagan'}
                  </p>
                </Card>
              ))}
            </div>
          )}
        </section>
      </main>
    </>
  );
}
