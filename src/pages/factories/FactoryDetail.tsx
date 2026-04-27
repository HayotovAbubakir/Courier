import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Navigation } from '@/components/Navigation';
import { DeliveryHistorySection } from '@/components/deliveries/DeliveryHistorySection';
import { Card, EmptyState, Loading } from '@/components/ui';
import { useApp } from '@/context/AppContext';
import { formatMoney, getRemainingBalance } from '@/lib/delivery-helpers';
import { getFactory, getFactoryDeliveries } from '@/lib/db-operations';

export default function FactoryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useApp();
  const [factory, setFactory] = useState<any>(null);
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void loadData();
  }, [id]);

  async function loadData() {
    try {
      setLoading(true);
      const [factoryData, deliveriesData] = await Promise.all([
        getFactory(id as string),
        getFactoryDeliveries(id as string),
      ]);
      setFactory(factoryData);
      setDeliveries(deliveriesData || []);
    } catch (error) {
      console.error('Error loading factory detail:', error);
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

  if (!factory) {
    return (
      <>
        <Navigation />
        <main className="mx-auto w-full max-w-7xl p-4 sm:p-6 lg:p-8">
          <EmptyState icon="x" title="Topilmadi" description="Zavod topilmadi" />
        </main>
      </>
    );
  }

  const totalReceivables = deliveries.reduce(
    (sum, delivery) => sum + getRemainingBalance(delivery.total_amount, delivery.paid_amount),
    0
  );
  const totalPaid = deliveries.reduce((sum, delivery) => sum + (delivery.paid_amount || 0), 0);

  return (
    <>
      <Navigation />
      <main className="mx-auto w-full max-w-7xl p-4 sm:p-6 lg:p-8">
        <Link
          to="/factories"
          className="mb-6 inline-flex items-center text-sm font-medium text-blue-600 hover:underline dark:text-blue-300"
        >
          {'<-'} Orqaga
        </Link>

        <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
          <Card className="md:col-span-2">
            <h1 className="mb-4 text-3xl font-bold text-gray-900 dark:text-white">
              {factory.name}
            </h1>
            <div className="space-y-2 text-gray-600 dark:text-gray-300">
              <p>
                <span className="font-semibold text-gray-800 dark:text-white">Telefon:</span>{' '}
                {factory.phone || 'Kiritilmagan'}
              </p>
              <p>
                <span className="font-semibold text-gray-800 dark:text-white">Manzil:</span>{' '}
                {factory.address || 'Kiritilmagan'}
              </p>
              {factory.created_at && (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  <span className="font-semibold text-gray-800 dark:text-white">Qo'shilgan:</span>{' '}
                  {new Date(factory.created_at).toLocaleDateString()}
                </p>
              )}
            </div>
          </Card>

          <div className="space-y-4">
            <Card>
              <p className="mb-2 text-sm text-gray-500 dark:text-gray-300">
                Faol qarzdorlik
              </p>
              <p className="mb-4 text-3xl font-bold text-red-600 dark:text-red-300">
                {formatMoney(totalReceivables)}
              </p>

              <p className="mb-2 text-sm text-gray-500 dark:text-gray-300">To'langan</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-300">
                {formatMoney(totalPaid)}
              </p>
            </Card>

            <Card>
              <p className="mb-2 text-sm text-gray-500 dark:text-gray-300">Jami yetkazib berishlar</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {deliveries.length}
              </p>
            </Card>
          </div>
        </div>

        <Card>
          <h2 className="mb-6 text-2xl font-bold text-gray-900 dark:text-white">
            {t('deliveryHistory')}
          </h2>

          <DeliveryHistorySection
            deliveries={deliveries}
            emptyDescription="Bu zavod uchun yetkazib berishlar hali mavjud emas."
            addDeliveryLink={`/deliveries?factory=${factory.id}`}
            onUpdated={loadData}
          />
        </Card>
      </main>
    </>
  );
}
