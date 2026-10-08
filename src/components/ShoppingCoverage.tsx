import { Globe2, ShoppingBag, Plane } from "lucide-react";

/** Cities we currently shop in. Add cities here as Tabedaar expands. */
export const SHOPPING_CITIES = ["Lahore"];
const cityText = SHOPPING_CITIES.join(", ");

export const ShoppingCoverageSection = () => (
  <section className="py-16 lg:py-20 bg-background">
    <div className="container mx-auto px-4">
      <div className="mx-auto max-w-5xl rounded-3xl bg-primary text-primary-foreground p-8 md:p-12 shadow-glow-primary">
        <div className="flex flex-col md:flex-row md:items-center gap-8">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-secondary text-secondary-foreground shadow-glow-accent mx-auto md:mx-0">
            <Globe2 className="h-11 w-11" aria-hidden="true" />
          </div>
          <div className="text-center md:text-left">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">From {cityText} to the World 🌍</h2>
            <p className="text-primary-foreground/85 leading-relaxed mb-3">
              Currently, we shop from stores across {cityText}, Pakistan, on your behalf. Whether it's clothes, gifts, food, groceries, or anything else you need, Tabedaar makes shopping from Pakistan easy. We can deliver your purchases anywhere in the world!
            </p>
            <p className="text-primary-foreground/70 text-sm">
              We're starting with {cityText} and plan to expand our shopping services to more cities across Pakistan soon.
            </p>
          </div>
        </div>
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex items-center gap-3 rounded-2xl bg-primary-foreground/10 p-4">
            <ShoppingBag className="h-6 w-6 text-secondary shrink-0" aria-hidden="true" />
            <div>
              <p className="text-xs uppercase tracking-wide text-primary-foreground/60">Where we shop</p>
              <p className="font-semibold">{cityText} only (for now)</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-2xl bg-primary-foreground/10 p-4">
            <Plane className="h-6 w-6 text-secondary shrink-0" aria-hidden="true" />
            <div>
              <p className="text-xs uppercase tracking-wide text-primary-foreground/60">Where we deliver</p>
              <p className="font-semibold">Anywhere in the world</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
);

export const ShoppingCoverageBanner = () => (
  <div className="flex gap-3 p-4 rounded-2xl border border-secondary/25 bg-secondary/5">
    <Globe2 className="h-5 w-5 mt-0.5 shrink-0 text-secondary" aria-hidden="true" />
    <div>
      <p className="text-sm font-semibold text-foreground">We Shop in {cityText}. We Deliver Worldwide! 🌍</p>
      <p className="text-xs leading-relaxed text-muted-foreground mt-1">
        Currently, our shopping service covers {cityText} only, but we deliver your purchases anywhere in the world. More Pakistani cities are coming soon!
      </p>
    </div>
  </div>
);
