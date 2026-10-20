import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { AIBotButton } from "@/components/AIBotButton";
import { Link } from "react-router-dom";

const sections = [
  {
    title: "1. About Our Service",
    paragraphs: [
      "Tabedaar.com is a personal shopping service based in Lahore, Pakistan. We shop from stores across Lahore on your behalf and arrange delivery of your purchases worldwide. Shopping services currently cover Lahore only.",
      "These Terms of Service apply when you use our website or mobile app, create an account, or place an order. Please read them alongside our Privacy Policy.",
    ],
  },
  {
    title: "2. Your Account",
    paragraphs: [
      "Provide accurate contact and delivery details and keep them up to date. You are responsible for keeping your password private and for activity on your account. Contact us if you believe someone has accessed your account without permission.",
      "Do not impersonate another person, misuse another customer's information, or use our service for fraudulent or unlawful activity.",
    ],
  },
  {
    title: "3. Orders and Item Availability",
    paragraphs: [
      "Include clear item descriptions, quantities, reference photos where helpful, and the correct delivery address. Submitting an order means we have received your request; it does not guarantee that every requested item is available or can be purchased at your expected price.",
      "Our team reviews requested items and confirms available items and pricing. Unavailable or unsuitable items may be rejected. Please review the approved items and confirmed amounts before paying. Once confirmed, the item list is locked; replacement requests for rejected items follow the options available in your order.",
    ],
  },
  {
    title: "4. Working Hours",
    paragraphs: [
      "Our operating hours are 9:00 AM to 6:00 PM Pakistan Standard Time (PKT). You may place orders at any time. Orders placed outside these hours are processed the next working day.",
      "Our team aims to review your order and get back to you within 1–2 hours during working hours. This is an estimated response time, not a guaranteed purchase or delivery time.",
    ],
  },
  {
    title: "5. Prices and Payments",
    paragraphs: [
      "Financial amounts in the app are shown in Pakistani Rupees (PKR/Rs.). The confirmed amount is based on approved items, their quantities, and applicable additional and delivery charges shown in your order. Expected prices entered with a request are estimates, not guaranteed store prices.",
      "Payments are made by bank transfer or a method agreed with our team. Upload proof of payment when requested. Uploading proof does not itself confirm payment; our team verifies it before marking the payment confirmed. Delivery charges may be requested and verified separately.",
    ],
  },
  {
    title: "6. Delivery",
    paragraphs: [
      "We arrange delivery to the address you provide. Availability, costs, and timing depend on the destination and the items ordered. International deliveries may be subject to customs rules, import restrictions, duties, or taxes; contact our team to clarify requirements for your destination before purchase.",
      "Delivery estimates can change because of store availability, courier delays, customs checks, or circumstances outside our control. Tell us promptly if your address is incorrect or if there is a delivery problem.",
    ],
  },
  {
    title: "7. Changes, Cancellations, and Refund Requests",
    paragraphs: [
      "Contact our team as soon as possible if you need to change or cancel an order, report a damaged or incorrect item, or request a refund. Available options depend on whether the item has already been purchased or dispatched and on the relevant store or courier's policies.",
      "Do not assume a change, cancellation, return, or refund is approved until our team confirms it. These terms do not remove any rights you may have under applicable law.",
    ],
  },
  {
    title: "8. Acceptable Use",
    paragraphs: [
      "Do not request prohibited or unlawful goods, upload content you are not entitled to share, submit false payment proof, interfere with the service, or attempt to access another person's account or order. We may refuse requests that cannot lawfully or safely be fulfilled.",
      "Items purchased by our riders or team members on your behalf belong entirely to you and have nothing to do with the company beyond the shopping facility itself. Tabedaar's purpose is only to provide the shopping and delivery facility; any bad, improper, or illegal use of a purchased item after purchase is solely the customer's responsibility, and Tabedaar will not be responsible for it.",
    ],
  },
  {
    title: "9. Service Responsibility",
    paragraphs: [
      "We take reasonable care when shopping and arranging delivery on your behalf. Store products and third-party delivery services are subject to their availability and applicable policies. If something goes wrong, contact us so we can review the issue and help resolve it.",
      "Nothing in these terms excludes responsibility or limits customer rights where doing so is not permitted by applicable law.",
    ],
  },
  {
    title: "10. Updates to These Terms",
    paragraphs: [
      "We may update these terms as our service changes. The latest version and its update date will be available on this page. Please review the terms before placing a new order.",
    ],
  },
];

const TermsOfService = () => (
  <div className="min-h-screen flex flex-col">
    <Header />
    <main className="flex-1 py-12">
      <div className="container mx-auto px-4 max-w-3xl">
        <h1 className="text-3xl font-bold mb-2">Terms of Service</h1>
        <p className="text-muted-foreground text-sm mb-8">Last updated: 20 October 2026</p>
        <div className="space-y-8">
          {sections.map((section) => (
            <section key={section.title}>
              <h2 className="text-xl font-semibold mb-3">{section.title}</h2>
              <div className="space-y-3">
                {section.paragraphs.map((paragraph) => (
                  <p key={paragraph} className="text-sm leading-relaxed text-foreground/80">{paragraph}</p>
                ))}
              </div>
            </section>
          ))}
          <section>
            <h2 className="text-xl font-semibold mb-3">11. Privacy and Contact</h2>
            <p className="text-sm leading-relaxed text-foreground/80">
              Read our <Link to="/privacy" className="text-primary underline underline-offset-4">Privacy Policy</Link> for information about your data, or visit <Link to="/data-deletion" className="text-primary underline underline-offset-4">Data Deletion</Link> to request removal of your account or personal information.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-foreground/80">
              For questions about these terms or your order, email <a href="mailto:contact@tabedaar.com" className="text-primary underline underline-offset-4 break-all">contact@tabedaar.com</a>. Our office is at IP Building, Gulberg, Lahore, Pakistan.
            </p>
          </section>
        </div>
      </div>
    </main>
    <Footer />
    <AIBotButton />
  </div>
);

export default TermsOfService;