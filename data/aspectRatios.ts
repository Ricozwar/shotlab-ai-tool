import { AspectRatioItem } from "../types";

export const ASPECT_RATIOS: AspectRatioItem[] = [
  {
    id: '1:1',
    label: '1:1 Kwadrat',
    category: 'E-commerce',
    description: 'Standard światowy. Allegro, Amazon, Instagram Feed.',
    usageTip: 'Najbezpieczniejszy wybór. Idealny do karuzeli i na białe tło.'
  },
  {
    id: '4:3',
    label: '4:3 Poziom',
    category: 'E-commerce',
    description: 'Szerokie meble (sofy, biurka, komody).',
    usageTip: 'Lepiej pokazuje szerokie produkty bez nadmiaru tła góra/dół. Świetne do galerii sklepu.'
  },
  {
    id: '3:4',
    label: '3:4 Pion',
    category: 'Social Media',
    description: 'Instagram Feed, Facebook Post, Pinterest.',
    usageTip: 'Alternatywa dla 4:5 i 2:3. Zajmuje dużo ekranu telefonu. Idealne, by pokazać podłogę i lampę nad meblem.'
  },
  {
    id: '9:16',
    label: '9:16 Pełny Pion',
    category: 'Social Media',
    description: 'Stories, Reels, TikTok.',
    usageTip: 'SAFE ZONES: Pamiętaj! Nie stawiaj mebla na samym dole kadru, bo zasłonią go napisy i opis filmu.'
  },
  {
    id: '16:9',
    label: '16:9 Panorama',
    category: 'Social Media',
    description: 'YouTube, Banery na stronę www.',
    usageTip: 'Szerokie ujęcia kinowe. Dobre na nagłówek strony głównej sklepu.'
  }
];