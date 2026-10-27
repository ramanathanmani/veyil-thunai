/**
 * Predefined locations in Tamil Nadu for offline location selection.
 * Coordinates are rounded to 2 decimal places per architecture privacy spec.
 */

export interface LocationCity {
  id: string;
  nameEn: string;
  nameTa: string;
  nameHi: string;
  lat: number;
  lon: number;
}

export const TAMIL_NADU_CITIES: LocationCity[] = [
  {
    id: 'sriperumbudur',
    nameEn: 'Sriperumbudur',
    nameTa: 'ஸ்ரீபெரும்புதூர்',
    nameHi: 'श्रीपेरंबदूर',
    lat: 12.97,
    lon: 79.94,
  },
  {
    id: 'chennai',
    nameEn: 'Chennai',
    nameTa: 'சென்னை',
    nameHi: 'चेन्नई',
    lat: 13.08,
    lon: 80.27,
  },
  {
    id: 'coimbatore',
    nameEn: 'Coimbatore',
    nameTa: 'கோயம்புத்தூர்',
    nameHi: 'कोयंबटूर',
    lat: 11.02,
    lon: 76.96,
  },
  {
    id: 'madurai',
    nameEn: 'Madurai',
    nameTa: 'மதுரை',
    nameHi: 'मदुरै',
    lat: 9.93,
    lon: 78.12,
  },
  {
    id: 'trichy',
    nameEn: 'Tiruchirappalli',
    nameTa: 'திருச்சிராப்பள்ளி',
    nameHi: 'तिरुचिरापल्ली',
    lat: 10.79,
    lon: 78.7,
  },
  {
    id: 'salem',
    nameEn: 'Salem',
    nameTa: 'சேலம்',
    nameHi: 'सेलम',
    lat: 11.66,
    lon: 78.15,
  },
  {
    id: 'tirunelveli',
    nameEn: 'Tirunelveli',
    nameTa: 'திருநெல்வேலி',
    nameHi: 'तिरुनेलवेली',
    lat: 8.71,
    lon: 77.76,
  },
  {
    id: 'vellore',
    nameEn: 'Vellore',
    nameTa: 'வேலூர்',
    nameHi: 'वेल्लोर',
    lat: 12.92,
    lon: 79.13,
  },
  {
    id: 'thoothukudi',
    nameEn: 'Thoothukudi',
    nameTa: 'தூத்துக்குடி',
    nameHi: 'थूथुकुडी',
    lat: 8.76,
    lon: 78.13,
  },
  {
    id: 'erode',
    nameEn: 'Erode',
    nameTa: 'ஈரோடு',
    nameHi: 'ईरोड',
    lat: 11.34,
    lon: 77.72,
  },
];

export const NATIONAL_HEAT_CITIES: LocationCity[] = [
  {
    id: 'delhi',
    nameEn: 'Delhi NCR',
    nameTa: 'டெல்லி (NCR)',
    nameHi: 'दिल्ली (एनसीआर)',
    lat: 28.61,
    lon: 77.21,
  },
  {
    id: 'mumbai',
    nameEn: 'Mumbai',
    nameTa: 'மும்பை',
    nameHi: 'मुंबई',
    lat: 19.08,
    lon: 72.88,
  },
  {
    id: 'nagpur',
    nameEn: 'Nagpur (Vidarbha)',
    nameTa: 'நாக்பூர்',
    nameHi: 'नागपुर',
    lat: 21.15,
    lon: 79.08,
  },
  {
    id: 'ahmedabad',
    nameEn: 'Ahmedabad',
    nameTa: 'அகமதாபாத்',
    nameHi: 'अहमदाबाद',
    lat: 23.02,
    lon: 72.57,
  },
  {
    id: 'hyderabad',
    nameEn: 'Hyderabad',
    nameTa: 'ஹைதராபாத்',
    nameHi: 'हैदराबाद',
    lat: 17.39,
    lon: 78.49,
  },
  {
    id: 'bengaluru',
    nameEn: 'Bengaluru',
    nameTa: 'பெங்களூரு',
    nameHi: 'बेंगलुरु',
    lat: 12.97,
    lon: 77.59,
  },
  {
    id: 'bhubaneswar',
    nameEn: 'Bhubaneswar',
    nameTa: 'புவனேஸ்வர்',
    nameHi: 'भुवनेश्वर',
    lat: 20.3,
    lon: 85.82,
  },
  {
    id: 'kolkata',
    nameEn: 'Kolkata',
    nameTa: 'கொல்கத்தா',
    nameHi: 'कोलकाता',
    lat: 22.57,
    lon: 88.36,
  },
];

export const ALL_CITIES: LocationCity[] = [...TAMIL_NADU_CITIES, ...NATIONAL_HEAT_CITIES];

export const DEFAULT_LOCATION = TAMIL_NADU_CITIES[0]; // Sriperumbudur
