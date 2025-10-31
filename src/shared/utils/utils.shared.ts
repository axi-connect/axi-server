export function generateCode():string{
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const randomLetters = [...Array(3)]
        .map(() => letters[Math.floor(Math.random() * letters.length)])
        .join('');
    
    const randomNumbers = (Math.random() * 90 + 10).toFixed(0); // Genera número entre 10-99
    
    return `${randomLetters}${randomNumbers}`;
}

export const parseDateSafe = (value: unknown): Date | undefined => {
    if (typeof value !== 'string' || value.length === 0) return undefined;
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? undefined : d;
};

export function normalizeInternationalPhone(phone?: string | null): string | null {
    if (!phone) return null;
    const trimmed = phone.trim();
    const digitsOnly = trimmed.replace(/[^0-9]/g, '');
    if (digitsOnly.length === 0) return null;
    return `+${digitsOnly}`;
}

/**
 * Eliminar diacritics (tildes) usando Unicode normalization
 * Estandarizar texto to lowercase para la consistencia de datos storage/search
*/
export function normalizeTextValue(value?: string | null): string | null {
    if (value == null) return null;
    const trimmed = value.trim();
    if (trimmed.length === 0) return '';
    const withoutDiacritics = trimmed.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return withoutDiacritics.toLowerCase();
}