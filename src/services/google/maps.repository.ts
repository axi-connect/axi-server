import { getCache, setCache } from '../../shared/utils/cache.util.js';
import { Client, Language, PlaceData } from '@googlemaps/google-maps-services-js';
import { GoogleMapsSearchInterface, GoogleMapsPlaceInterface } from '../../modules/leads/domain/leads.interface.js';

export class GoogleMapsRepository {
  private client: Client;
  private apiKey: string;

  constructor() {
    this.client = new Client({});
    this.apiKey = process.env.GOOGLE_MAPS_API_KEY || '';
    
    if (!this.apiKey) {
      console.warn('\x1b[33m⚠️  GOOGLE_MAPS_API_KEY no está configurada. Configúrala para habilitar las integraciones de Google Maps/Places.\x1b[0m');
    }
  }

  /**
   * Busca lugares en Google Maps basado en criterios de búsqueda.
   * Utiliza caché Redis para reducir llamadas a la API externa.
  */
  async searchPlaces(searchParams: GoogleMapsSearchInterface): Promise<GoogleMapsPlaceInterface[]> {
    if (!this.apiKey) {
      throw new Error('Google Maps API key no está configurada');
    }

    const {
      location,
      radius = 5000,
      type,
      keyword,
      maxResults = 20,
    } = searchParams;

    const cacheKey = this.buildCacheKey({ location, radius, type, keyword, maxResults });
    const ttlSeconds = this.getPlacesCacheTtl();

    // 1️⃣ Intentar obtener desde caché
    const cachedResult = await getCache<GoogleMapsPlaceInterface[]>(cacheKey);
    if (cachedResult) return cachedResult;

    // 2️⃣ Obtener coordenadas (lat/lng)
    const coords = await this.resolveCoordinates(location);
    if (!coords) {
      throw new Error(`No se pudo geocodificar la ubicación: "${location}"`);
    }

    // 3️⃣ Llamar API Google Places Nearby
    const places = await this.fetchPlacesFromGoogle(coords, radius, type, keyword);

    // 4️⃣ Enriquecer con detalles adicionales
    const enrichedPlaces = await this.enrichPlaces(places, maxResults);

    // 5️⃣ Guardar en caché (no bloqueante)
    setCache(cacheKey, enrichedPlaces, ttlSeconds).catch(() => undefined);

    return enrichedPlaces;
  }

  /**
   * Decodifica las rederencias de las fotos de Google Places
  */
  async getPhoto(photoRef: string): Promise<{ contentType: string; data: Buffer }> {
    const axios = (await import('axios')).default;
    const googleApiKey = process.env.GOOGLE_MAPS_API_KEY;
    const googleUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${encodeURIComponent(photoRef)}&key=${googleApiKey}`;
    const response = await axios.get(googleUrl, { responseType: 'arraybuffer' });
    return {
      contentType: response.headers['content-type'] || 'image/jpeg',
      data: response.data,
    };
  }

  /**
   * Resuelve coordenadas desde string de lat,lng o mediante geocoding.
  */
  private async resolveCoordinates(location: string): Promise<{ lat: number; lng: number } | null> {
    const looksLikeCoords = location.includes(',');
    if (looksLikeCoords) {
      return this.tryParseCoords(location);
    }
    return this.geocodeAddress(location);
  }

  /**
   * Llama a la API de Google Places Nearby.
  */
  private async fetchPlacesFromGoogle(
    coords: { lat: number; lng: number },
    radius: number,
    type?: string,
    keyword?: string
  ) {
    const response = await this.client.placesNearby({
      params: {
        language: Language.es,
        location: coords,
        radius,
        type: type as any,
        keyword,
        key: this.apiKey,
      },
    });

    if (!['OK', 'ZERO_RESULTS'].includes(response.data.status)) {
      throw new Error(`Google Maps API error: ${response.data.status}`);
    }

    return response.data.results || [];
  }

  /**
   * Enriquecer lugares con información adicional (solo lugares operativos).
  */
  private async enrichPlaces(places: any[], maxResults: number) {
    if (!Array.isArray(places) || places.length === 0) return [];

    // Prefiltrar para evitar negocios cerrados antes de enriquecer (CLOSED_TEMPORARILY, CLOSED_PERMANENTLY)
    const prefiltered = places.filter((p) => p?.business_status === 'OPERATIONAL');

    const mapped = await Promise.all(
      prefiltered
        .slice(0, maxResults)
        .map(async (place) => {
          const details = await this.getPlaceDetails(place.place_id ?? '');
          return this.mapPlaceToInterface(place, details);
        })
    );

    return mapped;
  }

  /**
   * Obtiene detalles específicos de un lugar
  */
  private async getPlaceDetails(placeId: string): Promise<Partial<PlaceData> | undefined> {
    try {
      const response = await this.client.placeDetails({
        params: {
          place_id: placeId,
          fields: ['name', 'formatted_address', 'formatted_phone_number', 'website', 'rating', 'reviews', 'opening_hours', 'geometry', 'types', 'business_status', 'url', 'photos'],
          key: this.apiKey,
        },
      });

      return response.data.result;
    } catch (error) {
      console.error('Error getting place details:', error);
      return undefined;
    }
  }

  /**
   * Mapea los datos de Google Maps a nuestra interfaz
   */
  private mapPlaceToInterface(place: Partial<PlaceData>, details?: Partial<PlaceData>): GoogleMapsPlaceInterface {
    return {
      url: details?.url || '',
      name: place.name || '',
      place_id: place.place_id as any,
      address: details?.formatted_address || place.vicinity || '',
      phone: details?.formatted_phone_number || '',
      website: details?.website || '',
      rating: place.rating || 0,
      reviews: details?.reviews as any || [],
      opening_hours: details?.opening_hours as any || null,
      photos: Array.isArray(details?.photos)
        ? (details.photos as any[]).map(p => p.photo_reference).filter((ref: any) => !!ref)
        : [],
      geometry: place.geometry ? {
        location: {
          lat: place.geometry.location.lat,
          lng: place.geometry.location.lng,
        }
      } : undefined,
      types: place.types || [],
      business_status: place.business_status || '',
    };
  }

  /**
   * Construye una clave de cache determinística a partir de los parámetros relevantes
  */
  private buildCacheKey(params: { location: string; radius: number; type?: string; keyword?: string; maxResults: number }): string {
    const normalized = {
      location: params.location,
      radius: params.radius,
      type: params.type || '',
      keyword: params.keyword || '',
      maxResults: params.maxResults,
      language: 'es',
    };
    const encoded = encodeURIComponent(JSON.stringify(normalized));
    return `gplaces:search:${encoded}`;
  }

  /**
   * TTL para cachear resultados de Places (por defecto 7 días)
  */
  private getPlacesCacheTtl(): number {
    const fallback = 60 * 60 * 24 * 7; // 7 días
    const envTtl = process.env.GOOGLE_PLACES_CACHE_TTL_SECONDS;
    const parsed = envTtl ? parseInt(envTtl, 10) : NaN;
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  }

  /**
   * Parsea la ubicación (puede ser coordenadas o dirección)
   */
  private tryParseCoords(location: string): { lat: number; lng: number } | null {
    try {
      const [lat, lng] = location.split(',').map(coord => parseFloat(coord.trim()));
      if (!isNaN(lat) && !isNaN(lng)) {
        return { lat, lng };
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Geocodifica una dirección a coordenadas
  */
  private async geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
    if (!this.apiKey) {
      throw new Error('Google Maps API key no está configurada');
    }

    try {
      const response = await this.client.geocode({
        params: {
          address: address,
          key: this.apiKey,
        },
      });

      if (response.data.status !== 'OK' || !response.data.results.length) {
        return null;
      }

      const location = response.data.results[0].geometry.location;
      return {
        lat: location.lat,
        lng: location.lng,
      };
    } catch (error) {
      console.error('Error geocoding address:', error);
      throw new Error(`Error al geocodificar la dirección: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Valida si la API key está configurada
   */
  isApiKeyConfigured(): boolean {
    return !!this.apiKey;
  }
} 