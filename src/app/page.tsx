'use client';

import { useEffect, useState } from 'react';
import { Navigation } from '@/components/Navigation';
import { Card, Button, Loading, EmptyState, Badge } from '@/components/ui';
import { useApp } from '@/context/AppContext';
import { getDashboardStats, getReminders } from '@/lib/db-operations';
import Link from 'next/link';

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

    loadData();
  }, []);

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
        <h1 className="text-3xl font-bold text-gray-900 mb-8">{t('dashboard')}</h1>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            icon="💰"
            label={t('totalReceivables')}
            value={stats?.totalReceivables ? `${stats.totalReceivables.toLocaleString()} so'm` : '0 so\'m'}
          />
          <StatCard
            icon="⏰"
            label={t('overdueAmount')}
            value={stats?.totalOverdue ? `${stats.totalOverdue.toLocaleString()} so'm` : '0 so\'m'}
            variant="danger"
          />
          <StatCard
            icon="📅"
            label={t('thisWeekPayments')}
            value={stats?.thisWeekPayments ? `${stats.thisWeekPayments.toLocaleString()} so'm` : '0 so\'m'}
            variant="warning"
          />
          <StatCard
            icon="✅"
            label={t('paidAmount')}
            value={stats?.totalPaid ? `${stats.totalPaid.toLocaleString()} so'm` : '0 so\'m'}
            variant="success"
          />
        </div>

        {/* Reminders Section */}
        <Card className="mb-8">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <span>🔔</span> {t('reminders')}
          </h2>

          {reminders.length === 0 ? (
            <EmptyState
              icon="✅"
              title={t('noData')}
              description="Hozircha muddati o'tgan yoki kelayotgan to'lovlar yo'q"
            />
          ) : (
            <div className="space-y-3">
              {reminders.slice(0, 5).map((reminder: any) => (
                <ReminderItem key={reminder.id} reminder={reminder} />
              ))}
            </div>
          )}

          {reminders.length > 5 && (
            <div className="text-center mt-4">
              <Link href="/reminders">
                <Button variant="ghost" size="sm">
                  View more...
                </Button>
              </Link>
            </div>
          )}
        </Card>

        {/* Quick Actions */}
        <Card>
          <h2 className="text-xl font-bold mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link href="/clients/new">
              <Button className="w-full" size="lg">
                ➕ {t('addClient')}
              </Button>
            </Link>
            <Link href="/deliveries/new">
              <Button className="w-full" size="lg">
                📦 {t('addDelivery')}
              </Button>
            </Link>
            <Link href="/clients">
              <Button className="w-full" variant="secondary" size="lg">
                👥 View Clients
              </Button>
            </Link>
            <Link href="/deliveries">
              <Button className="w-full" variant="secondary" size="lg">
                📋 View Deliveries
              </Button>
            </Link>
          </div>
        </Card>
      </main>
    </>
  );
}

function StatCard({
  icon,
  label,
  value,
  variant = 'default',
}: {
  icon: string;
  label: string;
  value: string;
  variant?: 'default' | 'danger' | 'warning' | 'success';
}) {
  const bgStyles = {
    default: 'bg-blue-50',
    danger: 'bg-red-50',
    warning: 'bg-yellow-50',
    success: 'bg-green-50',
  };

  const textStyles = {
    default: 'text-blue-900',
    danger: 'text-red-900',
    warning: 'text-yellow-900',
    success: 'text-green-900',
  };

  return (
    <div className={`${bgStyles[variant]} rounded-lg p-6`}>
      <div className="text-3xl mb-2">{icon}</div>
      <p className="text-gray-600 text-sm mb-1">{label}</p>
      <p className={`text-2xl font-bold ${textStyles[variant]}`}>{value}</p>
    </div>
  );
}

function ReminderItem({ reminder }: { reminder: any }) {
  const isOverdue = reminder.isOverdue;
  const color = isOverdue ? 'red' : 'yellow';

  return (
    <div className={`border-l-4 border-${color}-500 bg-${color}-50 p-4 rounded`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <p className="font-bold text-gray-900">{reminder.clients?.name}</p>
          <p className="text-sm text-gray-600">
            {reminder.delivery_items?.[0]?.product_name || 'Product'}
          </p>
          <p className="text-sm font-semibold text-gray-900 mt-1">
            {reminder.total_amount - (reminder.paid_amount || 0)} so'm
          </p>
        </div>
        <div className="text-right">
          {isOverdue ? (
            <Badge variant="danger">{reminder.daysOverdue} days overdue</Badge>
          ) : (
            <Badge variant="warning">Due soon</Badge>
          )}
          <p className="text-xs text-gray-600 mt-2">{reminder.due_date?.split('T')[0]}</p>
        </div>
      </div>
    </div>
  );
}
