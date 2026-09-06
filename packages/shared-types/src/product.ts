export interface NakshraProduct {
  id: number;
  slug: string;
  name: string;
  subtitle: string;
  category?: string;
  purpose?: string;
  price: number;
  original: number;
  rating?: number;
  reviews?: number;
  img: string;
  badges?: string[];
  shortDesc?: string;
  description?: string | string[];
  benefits?: string[];
  size?: string;
  material?: string;
  useFor?: string[];
  stock?: number;
}
