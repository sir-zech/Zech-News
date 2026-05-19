import { Injectable, signal } from '@angular/core';

export interface UserLocation {
  country: string;
  countryCode: string;
  city: string;
}

export interface CountryEntry {
  name: string;
  code: string;
  states?: string[];
}

const COUNTRIES: CountryEntry[] = [
  { name: 'Australia', code: 'au', states: ['New South Wales', 'Victoria', 'Queensland', 'Western Australia', 'South Australia', 'Tasmania'] },
  { name: 'Brazil', code: 'br', states: ['São Paulo', 'Rio de Janeiro', 'Minas Gerais', 'Bahia', 'Paraná'] },
  { name: 'Canada', code: 'ca', states: ['Ontario', 'Quebec', 'British Columbia', 'Alberta', 'Manitoba', 'Saskatchewan'] },
  { name: 'China', code: 'cn', states: ['Beijing', 'Shanghai', 'Guangdong', 'Sichuan', 'Zhejiang'] },
  { name: 'Egypt', code: 'eg', states: ['Cairo', 'Alexandria', 'Giza'] },
  { name: 'France', code: 'fr', states: ['Île-de-France', 'Provence', 'Occitanie', 'Normandy', 'Brittany'] },
  { name: 'Germany', code: 'de', states: ['Bavaria', 'Berlin', 'Hamburg', 'Hesse', 'North Rhine-Westphalia', 'Saxony'] },
  { name: 'Greece', code: 'gr', states: ['Attica', 'Thessaloniki', 'Crete'] },
  { name: 'Hong Kong', code: 'hk' },
  { name: 'India', code: 'in', states: ['Andhra Pradesh', 'Bihar', 'Delhi', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Assam', 'Chhattisgarh', 'Jammu and Kashmir', 'Arunachal Pradesh'] },
  { name: 'Ireland', code: 'ie', states: ['Dublin', 'Cork', 'Galway', 'Limerick'] },
  { name: 'Israel', code: 'il', states: ['Tel Aviv', 'Jerusalem', 'Haifa'] },
  { name: 'Italy', code: 'it', states: ['Lombardy', 'Lazio', 'Campania', 'Sicily', 'Veneto', 'Tuscany'] },
  { name: 'Japan', code: 'jp', states: ['Tokyo', 'Osaka', 'Kyoto', 'Hokkaido', 'Fukuoka', 'Okinawa'] },
  { name: 'Netherlands', code: 'nl', states: ['North Holland', 'South Holland', 'Utrecht'] },
  { name: 'Nigeria', code: 'ng', states: ['Lagos', 'Abuja', 'Kano', 'Rivers'] },
  { name: 'Norway', code: 'no', states: ['Oslo', 'Bergen', 'Trondheim'] },
  { name: 'Pakistan', code: 'pk', states: ['Punjab', 'Sindh', 'Khyber Pakhtunkhwa', 'Balochistan', 'Islamabad'] },
  { name: 'Philippines', code: 'ph', states: ['Metro Manila', 'Cebu', 'Davao'] },
  { name: 'Poland', code: 'pl', states: ['Masovia', 'Lesser Poland', 'Silesia'] },
  { name: 'Portugal', code: 'pt', states: ['Lisbon', 'Porto', 'Algarve'] },
  { name: 'Romania', code: 'ro', states: ['Bucharest', 'Cluj', 'Timișoara'] },
  { name: 'Russia', code: 'ru', states: ['Moscow', 'Saint Petersburg', 'Novosibirsk', 'Kazan'] },
  { name: 'Singapore', code: 'sg' },
  { name: 'South Africa', code: 'za', states: ['Gauteng', 'Western Cape', 'KwaZulu-Natal', 'Eastern Cape'] },
  { name: 'South Korea', code: 'kr', states: ['Seoul', 'Busan', 'Incheon', 'Daegu'] },
  { name: 'Spain', code: 'es', states: ['Madrid', 'Catalonia', 'Andalusia', 'Valencia', 'Basque Country', 'Galicia'] },
  { name: 'Sweden', code: 'se', states: ['Stockholm', 'Gothenburg', 'Malmö'] },
  { name: 'Switzerland', code: 'ch', states: ['Zurich', 'Geneva', 'Bern', 'Basel'] },
  { name: 'Taiwan', code: 'tw', states: ['Taipei', 'Kaohsiung', 'Taichung'] },
  { name: 'Turkey', code: 'tr', states: ['Istanbul', 'Ankara', 'Izmir', 'Antalya'] },
  { name: 'Ukraine', code: 'ua', states: ['Kyiv', 'Kharkiv', 'Odesa', 'Lviv'] },
  { name: 'United Arab Emirates', code: 'ae', states: ['Dubai', 'Abu Dhabi', 'Sharjah'] },
  { name: 'United Kingdom', code: 'gb', states: ['England', 'Scotland', 'Wales', 'Northern Ireland', 'London', 'Manchester', 'Birmingham', 'Edinburgh', 'Glasgow', 'Liverpool', 'Bristol'] },
  { name: 'United States', code: 'us', states: ['Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey', 'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming'] },
];

@Injectable({ providedIn: 'root' })
export class LocationService {
  readonly location = signal<UserLocation | null>(null);
  readonly loading = signal(false);
  readonly error = signal('');

  private cached: UserLocation | null = null;

  async detect(): Promise<UserLocation> {
    if (this.cached) {
      this.location.set(this.cached);
      return this.cached;
    }

    this.loading.set(true);
    this.error.set('');

    try {
      const loc = await this.fromGeolocation();
      this.cached = loc;
      this.location.set(loc);
      this.loading.set(false);
      return loc;
    } catch {
      try {
        const loc = await this.fromIP();
        this.cached = loc;
        this.location.set(loc);
        this.loading.set(false);
        return loc;
      } catch {
        const fallback: UserLocation = { country: 'United States', countryCode: 'us', city: '' };
        this.location.set(fallback);
        this.loading.set(false);
        return fallback;
      }
    }
  }

  setManual(country: string, countryCode: string, city: string) {
    const loc: UserLocation = { country, countryCode, city };
    this.cached = loc;
    this.location.set(loc);
  }

  searchLocations(query: string): { label: string; country: string; countryCode: string; city: string }[] {
    if (!query || query.length < 2) return [];
    const q = query.toLowerCase();
    const results: { label: string; country: string; countryCode: string; city: string }[] = [];

    for (const c of COUNTRIES) {
      if (c.name.toLowerCase().includes(q)) {
        results.push({ label: c.name, country: c.name, countryCode: c.code, city: '' });
      }
      if (c.states) {
        for (const s of c.states) {
          if (s.toLowerCase().includes(q)) {
            results.push({ label: `${s}, ${c.name}`, country: c.name, countryCode: c.code, city: s });
          }
        }
      }
      if (results.length >= 8) break;
    }

    return results.slice(0, 8);
  }

  getCountries(): CountryEntry[] {
    return COUNTRIES;
  }

  private fromGeolocation(): Promise<UserLocation> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) return reject('No geolocation');

      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          try {
            const res = await fetch(
              `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${pos.coords.latitude}&longitude=${pos.coords.longitude}&localityLanguage=en`
            );
            const data = await res.json();
            resolve({
              country: data.countryName || 'Unknown',
              countryCode: (data.countryCode || 'us').toLowerCase(),
              city: data.city || data.locality || ''
            });
          } catch {
            reject('Geocode failed');
          }
        },
        () => reject('Permission denied'),
        { timeout: 8000, maximumAge: 300000 }
      );
    });
  }

  private async fromIP(): Promise<UserLocation> {
    const res = await fetch('https://ipapi.co/json/');
    const data = await res.json();
    return {
      country: data.country_name || 'Unknown',
      countryCode: (data.country_code || 'us').toLowerCase(),
      city: data.city || ''
    };
  }
}
