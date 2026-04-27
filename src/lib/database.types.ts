export type Database = {
  public: {
    Tables: {
      clients: {
        Row: {
          id: string;
          name: string;
          phone: string;
          address: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          phone: string;
          address: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          phone?: string;
          address?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      factories: {
        Row: {
          id: string;
          name: string;
          phone: string;
          address: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          phone: string;
          address: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          phone?: string;
          address?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      deliveries: {
        Row: {
          id: string;
          client_id: string;
          factory_id: string | null;
          delivery_date: string;
          due_date: string | null;
          total_amount: number;
          paid_amount: number;
          status: 'unpaid' | 'partially_paid' | 'paid';
          notes: string | null;
        };
        Insert: {
          id?: string;
          client_id: string;
          factory_id?: string | null;
          delivery_date: string;
          due_date?: string | null;
          total_amount: number;
          paid_amount?: number;
          status?: 'unpaid' | 'partially_paid' | 'paid';
          notes?: string | null;
        };
        Update: {
          id?: string;
          client_id?: string;
          factory_id?: string | null;
          delivery_date?: string;
          due_date?: string | null;
          total_amount?: number;
          paid_amount?: number;
          status?: 'unpaid' | 'partially_paid' | 'paid';
          notes?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'deliveries_client_id_fkey';
            columns: ['client_id'];
            isOneToOne: false;
            referencedRelation: 'clients';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'deliveries_factory_id_fkey';
            columns: ['factory_id'];
            isOneToOne: false;
            referencedRelation: 'factories';
            referencedColumns: ['id'];
          },
        ];
      };
      delivery_items: {
        Row: {
          id: string;
          delivery_id: string;
          product_name: string;
          product_image_url: string | null;
          quantity: number;
          unit: string;
          unit_price: number;
          total_price: number;
        };
        Insert: {
          id?: string;
          delivery_id: string;
          product_name: string;
          product_image_url?: string | null;
          quantity: number;
          unit: string;
          unit_price: number;
          total_price: number;
        };
        Update: {
          id?: string;
          delivery_id?: string;
          product_name?: string;
          product_image_url?: string | null;
          quantity?: number;
          unit?: string;
          unit_price?: number;
          total_price?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'delivery_items_delivery_id_fkey';
            columns: ['delivery_id'];
            isOneToOne: false;
            referencedRelation: 'deliveries';
            referencedColumns: ['id'];
          },
        ];
      };
      payments: {
        Row: {
          id: string;
          delivery_id: string;
          amount: number;
          payment_date: string;
          notes: string | null;
        };
        Insert: {
          id?: string;
          delivery_id: string;
          amount: number;
          payment_date: string;
          notes?: string | null;
        };
        Update: {
          id?: string;
          delivery_id?: string;
          amount?: number;
          payment_date?: string;
          notes?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'payments_delivery_id_fkey';
            columns: ['delivery_id'];
            isOneToOne: false;
            referencedRelation: 'deliveries';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {};
    Functions: {};
    Enums: {};
  };
};
