import { getSupabaseClient, hasSupabaseConfig } from './supabase';
import type { Database } from './database.types';
import { getPaymentStatus, getRemainingBalance } from './delivery-helpers';

function getOptionalSupabase() {
  if (!hasSupabaseConfig()) {
    return null;
  }

  return getSupabaseClient();
}

function requireSupabase() {
  return getSupabaseClient();
}

export async function getClients() {
  const supabase = getOptionalSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function getFactories() {
  const supabase = getOptionalSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('factories')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function getClient(id: string) {
  const supabase = getOptionalSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase.from('clients').select('*').eq('id', id).single();

  if (error) throw error;
  return data;
}

export async function getFactory(id: string) {
  const supabase = getOptionalSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase.from('factories').select('*').eq('id', id).single();

  if (error) throw error;
  return data;
}

export async function createFactory(factory: Database['public']['Tables']['factories']['Insert']) {
  const { data, error } = await requireSupabase()
    .from('factories')
    .insert([factory])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function createClient(client: Database['public']['Tables']['clients']['Insert']) {
  const { data, error } = await requireSupabase()
    .from('clients')
    .insert([client])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateFactory(
  id: string,
  factory: Database['public']['Tables']['factories']['Update']
) {
  const { data, error } = await requireSupabase()
    .from('factories')
    .update(factory)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateClient(
  id: string,
  client: Database['public']['Tables']['clients']['Update']
) {
  const { data, error } = await requireSupabase()
    .from('clients')
    .update(client)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteClient(id: string) {
  const { error } = await requireSupabase().from('clients').delete().eq('id', id);

  if (error) throw error;
}

export async function deleteFactory(id: string) {
  const { error } = await requireSupabase().from('factories').delete().eq('id', id);

  if (error) throw error;
}

export async function getDeliveries() {
  const supabase = getOptionalSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('deliveries')
    .select('*, clients(*), factories(*), delivery_items(*), payments(*)')
    .order('delivery_date', { ascending: false });

  if (error) throw error;
  return data;
}

export async function getDelivery(id: string) {
  const supabase = getOptionalSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('deliveries')
    .select('*, clients(*), factories(*), delivery_items(*), payments(*)')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

export async function getClientDeliveries(clientId: string) {
  const supabase = getOptionalSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('deliveries')
    .select('*, clients(*), factories(*), delivery_items(*), payments(*)')
    .eq('client_id', clientId)
    .order('delivery_date', { ascending: false });

  if (error) throw error;
  return data;
}

export async function getFactoryDeliveries(factoryId: string) {
  const supabase = getOptionalSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('deliveries')
    .select('*, clients(*), factories(*), delivery_items(*), payments(*)')
    .eq('factory_id', factoryId)
    .order('delivery_date', { ascending: false });

  if (error) throw error;
  return data;
}

export async function createDelivery(delivery: Database['public']['Tables']['deliveries']['Insert']) {
  const { data, error } = await requireSupabase()
    .from('deliveries')
    .insert([delivery])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateDeliveryWithItems(
  deliveryId: string,
  delivery: Pick<Database['public']['Tables']['deliveries']['Update'], 'due_date' | 'notes'>,
  items: Array<
    Pick<
      Database['public']['Tables']['delivery_items']['Update'],
      'id' | 'product_name' | 'quantity' | 'unit' | 'unit_price'
    >
  >
) {
  const supabase = requireSupabase();
  const totalAmount = items.reduce(
    (sum, item) => sum + (item.quantity || 0) * (item.unit_price || 0),
    0
  );

  const { data: currentDelivery, error: currentDeliveryError } = await supabase
    .from('deliveries')
    .select('paid_amount')
    .eq('id', deliveryId)
    .single();

  if (currentDeliveryError) throw currentDeliveryError;

  const paidAmount = currentDelivery.paid_amount || 0;
  const nextStatus = getPaymentStatus(totalAmount, paidAmount);

  const { error: deliveryError } = await supabase
    .from('deliveries')
    .update({
      due_date: delivery.due_date ?? null,
      notes: delivery.notes ?? null,
      total_amount: totalAmount,
      status: nextStatus,
    })
    .eq('id', deliveryId);

  if (deliveryError) throw deliveryError;

  for (const item of items) {
    const { error: itemError } = await supabase
      .from('delivery_items')
      .update({
        product_name: item.product_name,
        quantity: item.quantity,
        unit: item.unit,
        unit_price: item.unit_price,
        total_price: (item.quantity || 0) * (item.unit_price || 0),
      })
      .eq('id', item.id as string)
      .eq('delivery_id', deliveryId);

    if (itemError) throw itemError;
  }
}

export async function deleteDeliveryWithRelations(deliveryId: string) {
  const supabase = requireSupabase();

  const { error: paymentsError } = await supabase
    .from('payments')
    .delete()
    .eq('delivery_id', deliveryId);
  if (paymentsError) throw paymentsError;

  const { error: itemsError } = await supabase
    .from('delivery_items')
    .delete()
    .eq('delivery_id', deliveryId);
  if (itemsError) throw itemsError;

  const { error: deliveryError } = await supabase
    .from('deliveries')
    .delete()
    .eq('id', deliveryId);
  if (deliveryError) throw deliveryError;
}

export async function createDeliveryItem(
  item: Database['public']['Tables']['delivery_items']['Insert']
) {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('delivery_items')
    .insert([item])
    .select()
    .single();

  if (!error) {
    return data;
  }

  const hasMissingImageColumnError =
    error.code === 'PGRST204' &&
    typeof error.message === 'string' &&
    error.message.includes('product_image_url');

  if (!hasMissingImageColumnError) {
    throw error;
  }

  const { product_image_url: _ignored, ...legacyItem } = item;
  const { data: legacyData, error: legacyError } = await supabase
    .from('delivery_items')
    .insert([legacyItem])
    .select()
    .single();

  if (legacyError) {
    throw legacyError;
  }

  console.warn(
    "delivery_items.product_image_url ustuni topilmadi. Delivery item rasm URL'siz saqlandi."
  );
  return legacyData;
}

export async function uploadProductImage(
  file: File,
  deliveryId: string,
  itemId: string
) {
  const supabase = requireSupabase();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-');
  const filePath = `${deliveryId}/${itemId}-${Date.now()}-${safeName}`;

  const { data, error } = await supabase.storage.from('products').upload(filePath, file, {
    cacheControl: '3600',
    upsert: false,
  });

  if (error) throw error;

  const { data: publicUrlData } = supabase.storage.from('products').getPublicUrl(data.path);
  return publicUrlData.publicUrl;
}

export async function getPayments() {
  const supabase = getOptionalSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('payments')
    .select('*, deliveries(*, clients(*), factories(*))')
    .order('payment_date', { ascending: false });

  if (error) throw error;
  return data;
}

export async function getDeliveryPayments(deliveryId: string) {
  const supabase = getOptionalSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('delivery_id', deliveryId)
    .order('payment_date', { ascending: false });

  if (error) throw error;
  return data;
}

export async function recordPayment(payment: Database['public']['Tables']['payments']['Insert']) {
  const supabase = requireSupabase();

  const { data: delivery, error: deliveryError } = await supabase
    .from('deliveries')
    .select('paid_amount, total_amount')
    .eq('id', payment.delivery_id)
    .single();

  if (deliveryError) throw deliveryError;

  const remainingBalance = getRemainingBalance(delivery.total_amount, delivery.paid_amount);

  if (payment.amount <= 0) {
    throw new Error("To'lov summasi 0 dan katta bo'lishi kerak");
  }

  if (payment.amount > remainingBalance) {
    throw new Error("To'lov qoldiq summadan oshib ketdi");
  }

  const { data: paymentData, error: paymentError } = await supabase
    .from('payments')
    .insert([payment])
    .select()
    .single();

  if (paymentError) throw paymentError;

  const newPaidAmount = Math.min(delivery.total_amount, (delivery.paid_amount || 0) + payment.amount);
  const newStatus = getPaymentStatus(delivery.total_amount, newPaidAmount);

  const { error: updateError } = await supabase
    .from('deliveries')
    .update({
      paid_amount: newPaidAmount,
      status: newStatus,
    })
    .eq('id', payment.delivery_id);

  if (updateError) throw updateError;

  return paymentData;
}

export async function getDashboardStats() {
  const supabase = getOptionalSupabase();
  if (!supabase) {
    return {
      totalReceivables: 0,
      totalPaid: 0,
      totalOverdue: 0,
      thisWeekPayments: 0,
      totalClients: 0,
      totalDeliveries: 0,
      totalItems: 0,
    };
  }

  const [
    { data: deliveries, error: deliveriesError },
    { data: payments, error: paymentsError },
    { count: clientsCount, error: clientsError },
    { count: deliveryItemsCount, error: deliveryItemsError },
  ] = await Promise.all([
    supabase.from('deliveries').select('total_amount, paid_amount, status, due_date'),
    supabase.from('payments').select('amount'),
    supabase.from('clients').select('id', { count: 'exact', head: true }),
    supabase.from('delivery_items').select('id', { count: 'exact', head: true }),
  ]);

  if (deliveriesError) throw deliveriesError;
  if (paymentsError) throw paymentsError;
  if (clientsError) throw clientsError;
  if (deliveryItemsError) throw deliveryItemsError;

  const deliveryRows = deliveries ?? [];
  const paymentRows = payments ?? [];
  const totalReceivables = deliveryRows.reduce((sum, delivery) => sum + delivery.total_amount, 0);
  const totalPaid = paymentRows.reduce((sum, payment) => sum + payment.amount, 0);
  const totalOverdue = deliveryRows
    .filter(
      (delivery) =>
        delivery.due_date && new Date(delivery.due_date) < new Date() && delivery.status !== 'paid'
    )
    .reduce((sum, delivery) => sum + getRemainingBalance(delivery.total_amount, delivery.paid_amount), 0);

  const now = new Date();
  const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const thisWeekPayments = deliveryRows
    .filter(
      (delivery) =>
        delivery.due_date &&
        new Date(delivery.due_date) >= now &&
        new Date(delivery.due_date) <= weekFromNow &&
        delivery.status !== 'paid'
    )
    .reduce((sum, delivery) => sum + getRemainingBalance(delivery.total_amount, delivery.paid_amount), 0);

  return {
    totalReceivables,
    totalPaid,
    totalOverdue,
    thisWeekPayments,
    totalClients: clientsCount ?? 0,
    totalDeliveries: deliveryRows.length,
    totalItems: deliveryItemsCount ?? 0,
  };
}

export async function getReminders() {
  const supabase = getOptionalSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('deliveries')
    .select('*, clients(*), factories(*), delivery_items(*)')
    .neq('status', 'paid')
    .order('due_date', { ascending: true });

  if (error) throw error;

  const deliveries = data ?? [];
  const now = new Date();

  return deliveries
    .filter(
      (delivery) =>
        delivery.due_date &&
        new Date(delivery.due_date) < now &&
        getRemainingBalance(delivery.total_amount, delivery.paid_amount) > 0
    )
    .map((delivery) => ({
      ...delivery,
      isOverdue: true,
      daysOverdue: delivery.due_date
        ? Math.floor((now.getTime() - new Date(delivery.due_date).getTime()) / (24 * 60 * 60 * 1000))
        : 0,
    }));
}
