import { Package, Mail, Phone, MapPin, Truck, Facebook, Instagram } from "lucide-react";

export const Footer = () => {
  return (
    <footer className="border-t border-border bg-muted/30">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <div className="rounded-lg bg-gradient-to-br from-primary to-accent p-2 relative">
                <Package className="h-5 w-5 text-primary-foreground" />
                <Truck className="h-3 w-3 text-primary-foreground absolute -top-1 -right-1" />
              </div>
              <span className="text-lg font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Desi Drop
              </span>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Your trusted delivery service from Lahore. Order anything, anytime!
            </p>
            <div className="flex items-center space-x-3">
              <a 
                href="https://facebook.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="p-2 rounded-lg bg-muted hover:bg-primary hover:text-primary-foreground transition-colors"
                aria-label="Facebook"
              >
                <Facebook className="h-5 w-5" />
              </a>
              <a 
                href="https://instagram.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="p-2 rounded-lg bg-muted hover:bg-primary hover:text-primary-foreground transition-colors"
                aria-label="Instagram"
              >
                <Instagram className="h-5 w-5" />
              </a>
              <a 
                href="https://tiktok.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="p-2 rounded-lg bg-muted hover:bg-primary hover:text-primary-foreground transition-colors"
                aria-label="TikTok"
              >
                <svg 
                  className="h-5 w-5" 
                  fill="currentColor" 
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
                </svg>
              </a>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <a href="/place-order" className="hover:text-primary transition-colors">
                  Place Order
                </a>
              </li>
              <li>
                <a href="/orders" className="hover:text-primary transition-colors">
                  Order History
                </a>
              </li>
              <li>
                <a href="/track" className="hover:text-primary transition-colors">
                  Track Order
                </a>
              </li>
              <li>
                <a href="/contact" className="hover:text-primary transition-colors">
                  Contact Us
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-4">Contact Info</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center space-x-2">
                <MapPin className="h-4 w-4" />
                <span>Lahore, Pakistan</span>
              </li>
              <li className="flex items-center space-x-2">
                <Phone className="h-4 w-4" />
                <span>+92 300 1234567</span>
              </li>
              <li className="flex items-center space-x-2">
                <Mail className="h-4 w-4" />
                <span>info@desidrop.com</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-border text-center text-sm text-muted-foreground">
          <p>&copy; 2025 Desi Drop. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};
