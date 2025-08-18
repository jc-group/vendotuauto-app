import { Injectable } from '@angular/core';
import { environment } from '@environments/environment';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface ListingDraft {
  title: string;
  brand: string;
  model: string;
  year: number;
  price: number;
  status?: string;
  description?: string | null;
  municipality_name?: string | null;
  [key: string]: unknown;
}

@Injectable({ providedIn: 'root' })
export class SupabaseService {
  private supabase: SupabaseClient | null = null;

  /** Inicializa el cliente de Supabase */
  initClient(): void {
    if (!this.supabase) {
      this.supabase = createClient(
        environment.supabaseUrl,
        environment.supabaseAnonKey
      );
    }
  }

  /** Inserta un nuevo registro en la tabla 'listings' */
  async createListing(draft: ListingDraft): Promise<ListingDraft[]> {
    this.initClient();
    const { error, data } = await this.supabase!.from('listings').insert([
      draft,
    ]);
    if (error) throw error;
    return (data ?? []) as ListingDraft[];
  }

  /** Obtiene todos los registros con un estado específico */
  async getListingsByStatus(status: string): Promise<ListingDraft[]> {
    this.initClient();
    const { error, data } = await this.supabase!.from('listings')
      .select('*')
      .eq('status', status);
    if (error) throw error;
    return (data ?? []) as ListingDraft[];
  }

  /** Actualiza el estado de un registro */
  async updateListingStatus(
    id: string,
    status: string
  ): Promise<ListingDraft[]> {
    this.initClient();
    const { error, data } = await this.supabase!.from('listings')
      .update({ status })
      .eq('id', id);
    if (error) throw error;
    return (data ?? []) as ListingDraft[];
  }

  /** Sube una foto al bucket 'listings-photos' y devuelve la URL pública */
  async uploadPhoto(file: File): Promise<string> {
    this.initClient();
    const fileName = `${Date.now()}_${file.name}`;
    const { error } = await this.supabase!.storage.from(
      'listings-photos'
    ).upload(fileName, file);
    if (error) throw error;

    const { data: publicUrlData } =
      this.supabase!.storage.from('listings-photos').getPublicUrl(fileName);
    if (!publicUrlData?.publicUrl)
      throw new Error('No se pudo obtener la URL pública');
    return publicUrlData.publicUrl;
  }

  /** Borra una foto del bucket 'listings-photos' */
  async deletePhoto(filename: string): Promise<void> {
    this.initClient();
    const { error } = await this.supabase!.storage.from(
      'listings-photos'
    ).remove([filename]);
    if (error) throw error;
  }
}
