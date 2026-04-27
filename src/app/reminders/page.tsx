'use client';

import { useEffect, useState } from 'react';
import { Navigation } from '@/components/Navigation';
import { Card, Button, Loading, EmptyState, Badge } from '@/components/ui';
import { useApp } from '@/context/AppContext';
import { getReminders } from '@/lib/db-operations';
import Link from 'next/link';

export default function RemindersPage() {
  const { t } = useApp();
  const [reminders, setReminders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReminders();
  }, []);

  async function loadReminders() {
    try {
      setLoading(true);
      const data = await getReminders();
      setReminders(data || []);
    } catch (error) {
      console.error('Error loading reminders:', error);
    } finally {
      setLoading(false);
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

  const overdueReminders = reminders.filter((r: any) => r.isOverdue);
  const upcomingReminders = reminders.filter((r: any) => !r.isOverdue);

  return (
    <>
      <Navigation />
      <main className="flex-1 max-w-7xl mx-auto w-full p-4 sm:p-6 lg:p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">{t('reminders')}</h1>

        {/* Overdue Reminders */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-red-600 mb-4 flex items-center gap-2">
            🔴 {t('overdue_payments')}
          </h2>

          {overdueReminders.length === 0 ? (
            <div className="bg-green-50 border border-green-200 p-6 rounded-lg text-center">
              <p className="text-green-900 font-semibold">✅ Muddati o'tgan to'lovlar yo'q!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {overdueReminders.map((reminder: any) => (
                <ReminderCard key={reminder.id} reminder={reminder} isOverdue={true} />
              ))}
            </div>
          )}
        </div>

        {/* Upcoming Reminders */}
        <div>
          <h2 className="text-2xl font-bold text-yellow-600 mb-4 flex items-center gap-2">
            🟡 {t('upcoming_payments')}
          </h2>

          {upcomingReminders.length === 0 ? (
            <div className="bg-gray-50 border border-gray-200 p-6 rounded-lg text-center">
              <p className="text-gray-600">Kelayotgan to'lovlar yo'q</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {upcomingReminders.map((reminder: any) => (
                <ReminderCard key={reminder.id} reminder={reminder} isOverdue={false} />
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
}

function ReminderCard({ reminder, isOverdue }: { reminder: any; isOverdue: boolean }) {
  return (
    <Card className={isOverdue ? 'border-2 border-red-500 bg-red-50' : 'border-2 border-yellow-500 bg-yellow-50'}>
      {reminder.delivery_items?.[0]?.product_image_url && (
        <div className="mb-3 h-32 bg-gray-200 rounded flex items-center justify-center text-4xl overflow-hidden">
          <img
            src={reminder.delivery_items[0].product_image_url}
            alt={reminder.delivery_items[0].product_name}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      <h3 className="text-lg font-bold text-gray-900 mb-1">{reminder.clients?.name}</h3>

      <p className="text-sm text-gray-600 mb-2">
        <span className="font-semibold">{reminder.delivery_items?.[0]?.product_name || 'Product'}</span>
      </p>

      <div className="mb-3">
        <p className="text-gray-600 text-sm">Qarzdorlik</p>
        <p className="text-2xl font-bold text-red-600">
          {reminder.total_amount - (reminder.paid_amount || 0)} so'm
        </p>
      </div>

      <div className="mb-4">
        {isOverdue ? (
          <Badge variant="danger">🔴 {reminder.daysOverdue} kun muddati o'tgan</Badge>
        ) : (
          <Badge variant="warning">🟡 Muddati: {reminder.due_date?.split('T')[0]}</Badge>
        )}
      </div>

      <div className="flex gap-2">
        <Link href={`/deliveries/${reminder.id}`} className="flex-1">
          <Button variant="secondary" size="sm" className="w-full">
            Tafsilotlar
          </Button>
        </Link>
        <Link href={`/clients/${reminder.client_id}`} className="flex-1">
          <Button size="sm" className="w-full">
            To'lash
          </Button>
        </Link>
      </div>
    </Card>
  );
}
