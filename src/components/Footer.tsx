import { Link } from "react-router-dom";
import { Mail, Phone, MapPin, MessageCircle, Facebook, Instagram, Twitter } from "lucide-react";
import { Button } from "@/components/ui/button";
import logo from "@/assets/tabedaar-logo.png";

export const Footer = () => {
  const quickLinks = [
    { label: "Home", href: "/" },
    { label: "Place Order", href: "/place-order" },
    { label: "Track Order", href: "/track" },
    { label: "Contact Us", href: "/contact" },
  ];

  const legalLinks = [
    { label: "Privacy Policy", href: "#" },
    { label: "Terms of Service", href: "#" },
  ];

  return (
    <footer className="footer-dark">
      <div className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          {/* Brand Section */}
          <div className="lg:col-span-1">
            <div className="flex items-center gap-3 mb-4">
              <img 
                src={logo} 
                alt="Tabedaar.com Logo" 
                className="h-28 md:h-36 w-auto object-contain brightness-0 invert"
              />
            </div>
            <p className="text-white/70 mb-6 text-sm leading-relaxed">
              Your personal shopper in Pakistan. We help overseas Pakistanis and local customers shop anything with complete transparency and reliability.
            </p>
            
            {/* WhatsApp CTA */}
            <a 
              href="https://wa.me/923001234567" 
              target="_blank" 
              rel="noopener noreferrer"
            >
              <Button 
                className="rounded-xl gap-2 bg-success hover:bg-success/90 text-white font-medium"
              >
                <MessageCircle className="h-5 w-5" />
                Chat on WhatsApp
              </Button>
            </a>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold text-lg mb-5 text-white">Quick Links</h4>
            <ul className="space-y-3">
              {quickLinks.map((link, index) => (
                <li key={index}>
                  <Link 
                    to={link.href} 
                    className="text-white/70 hover:text-white transition-colors text-sm"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h4 className="font-semibold text-lg mb-5 text-white">Contact Us</h4>
            <ul className="space-y-4">
              <li>
                <a 
                  href="https://maps.google.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-start gap-3 text-white/70 hover:text-white transition-colors text-sm"
                >
                  <MapPin className="h-5 w-5 mt-0.5 flex-shrink-0" />
                  <span>Lahore, Pakistan</span>
                </a>
              </li>
              <li>
                <a 
                  href="tel:+923001234567" 
                  className="flex items-center gap-3 text-white/70 hover:text-white transition-colors text-sm"
                >
                  <Phone className="h-5 w-5 flex-shrink-0" />
                  <span>+92 300 1234567</span>
                </a>
              </li>
              <li>
                <a 
                  href="mailto:info@tabedaar.com" 
                  className="flex items-center gap-3 text-white/70 hover:text-white transition-colors text-sm"
                >
                  <Mail className="h-5 w-5 flex-shrink-0" />
                  <span>info@tabedaar.com</span>
                </a>
              </li>
            </ul>
          </div>

          {/* Social & Legal */}
          <div>
            <h4 className="font-semibold text-lg mb-5 text-white">Follow Us</h4>
            <div className="flex gap-3 mb-6">
              <a 
                href="#" 
                className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
              >
                <Facebook className="h-5 w-5 text-white" />
              </a>
              <a 
                href="#" 
                className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
              >
                <Instagram className="h-5 w-5 text-white" />
              </a>
              <a 
                href="#" 
                className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
              >
                <Twitter className="h-5 w-5 text-white" />
              </a>
            </div>

            <h4 className="font-semibold text-sm mb-3 text-white">Legal</h4>
            <ul className="space-y-2">
              {legalLinks.map((link, index) => (
                <li key={index}>
                  <a 
                    href={link.href} 
                    className="text-white/70 hover:text-white transition-colors text-sm"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/10">
        <div className="container mx-auto px-4 py-6">
          <p className="text-center text-sm text-white/50">
            &copy; {new Date().getFullYear()} Tabedaar.com. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};