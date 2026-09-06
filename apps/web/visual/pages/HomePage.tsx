import { useNavigate } from "react-router";
import { NavagrahaHero } from "@visual/components/home/NavagrahaHero";
import { ShopConsultCards } from "@visual/components/home/ShopConsultCards";
import { HowItsMade } from "@visual/components/home/HowItsMade";
import { ProductsAndCombos } from "@visual/components/home/ProductsAndCombos";
import { WhyNakshra } from "@visual/components/home/WhyNakshra";
import { VideoTestimonials } from "@visual/components/home/VideoTestimonials";
import { CommunityComments } from "@visual/components/home/CommunityComments";
import { Newsletter } from "@visual/components/home/Newsletter";
import { COMBOS } from "@nakshra/shared-config/data";
import { NakshraProduct } from "@nakshra/shared-types/product";
import { useCart } from "@nakshra/shared-state";
import { useProducts } from "@nakshra/shared-hooks/useProducts";
import { AstroChatWidget } from "@visual/components/product/AstroChatWidget";

export function HomePage() {
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { products } = useProducts();

  const goToShop = () => navigate("/shop");
  const goToProduct = (p: NakshraProduct) => navigate(`/shop/${p.slug}`);

  const handleAddCombo = (name: string) => {
    const combo = COMBOS.find(c => c.name === name);
    // Use first product as placeholder for combo if no exact match, though normally combo should be its own item
    if (combo && products.length > 0) { 
      addToCart({ ...products[0], name: combo.name, price: combo.price, original: combo.original }, 1); 
    }
  };

  return (
    <main>
      <NavagrahaHero onShop={goToShop} onConsult={() => navigate("/consult")} />
      <ShopConsultCards products={products} onShop={goToShop} onProductClick={goToProduct} />
      <HowItsMade />
      <ProductsAndCombos products={products} onProductClick={goToProduct} onAddToCart={p => addToCart(p)} onAddCombo={handleAddCombo} />
      <WhyNakshra />
      <VideoTestimonials />
      <CommunityComments products={products} />
      <Newsletter />
      <AstroChatWidget />
    </main>
  );
}
