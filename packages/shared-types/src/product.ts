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
  /** Listing this product is an option of, e.g. "Baglamukhi Yantra". Each option
   *  stays its own product, so cart, stock and orders work per option. */
  variantGroup?: string;
  /** This option's name in the product page's picker, e.g. "Silver, 4 inch". */
  variantLabel?: string;
  /** Set by groupVariants() on the one card a group shows in listings. */
  variantCount?: number;
}
