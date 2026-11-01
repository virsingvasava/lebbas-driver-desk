// Same colours as the admin "Route Map" page
export const EMIRATES: Record<string, { name: string; color: string }> = {
  AUH: { name: 'Abu Dhabi', color: '#7c3aed' },
  DXB: { name: 'Dubai', color: '#2563eb' },
  SHJ: { name: 'Sharjah', color: '#ea580c' },
  AJM: { name: 'Ajman', color: '#db2777' },
  UAQ: { name: 'Umm Al Quwain', color: '#0d9488' },
  RAK: { name: 'Ras Al Khaimah', color: '#ca8a04' },
  FUJ: { name: 'Fujairah', color: '#dc2626' },
};

export const colorOf = (code?: string | null): string => (code && EMIRATES[code]?.color) || '#475569';
export const nameOf = (code?: string | null): string => (code && EMIRATES[code]?.name) || '';
