import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { AIBotButton } from "@/components/AIBotButton";

const sections = [
  {
    title: "Website Advertising Measurement",
    body: [
      "We use the Meta Pixel on our website to report page visits and successful order submissions (as Lead events) to Meta Platforms for measuring Facebook and Instagram advertising and supporting ad optimization. An order submission is not a paid purchase; we do not report payment amounts or purchase events through this installation.",
      "Meta receives browser/device information, IP address, eligible page URL, advertising click identifiers and advertising cookie identifiers (such as _fbp and _fbc). We do not deliberately share names, email addresses, phone numbers, delivery addresses, item details, uploaded photos or bank/payment information through the Pixel. Automatic form-data collection and automatic website events are disabled in this installation. Order event identifiers prevent duplicate reporting; we do not enable customer matching or server-side uploads.",
      "In regions requiring advertising consent, we block the Pixel until you accept advertising tracking. If your region cannot be established, the same consent requirement applies. Elsewhere, ordinary advertising measurement is enabled unless you reject it or your browser communicates an applicable privacy opt-out. Meta separately records ad clicks and impressions whether or not you accept website tracking.",
      "You can accept, reject or withdraw advertising permission through Cookie settings in the footer. Rejection is as easy as acceptance and withdrawal stops future website advertising events; earlier blocked events are not replayed. Your browser stores your visitor identifier, choice, region, date/time, notice version and notice text, retaining earlier acceptance evidence if you later withdraw. Clearing browser storage clears this local record and may prompt you again. Essential account/order services do not depend on advertising acceptance.",
      "Meta handles the information it receives under its privacy policies, including possible international processing. Learn more at https://www.facebook.com/privacy/policy/ and manage advertising preferences in your Meta account. Contact contact@tabedaar.com with privacy questions. This installation measures website activity only, not activity in our native mobile apps.",
    ],
  },
  {
    title: "1. Introduction",
    body: [
      "Tabedaar.com (\"we\", \"our\", \"us\") is a personal shopping service based in Lahore, Pakistan. We shop on your behalf and deliver your purchases anywhere in the world.",
      "This Privacy Policy explains what information we collect when you use our website or mobile app, how we use it, and the choices you have. By creating an account or placing an order, you agree to this policy.",
    ],
  },
  {
    title: "2. Information We Collect",
    body: [
      "Account details: your name, email address, and phone number when you sign up.",
      "Order details: the items you ask us to buy, quantities, prices, notes, and the delivery address you provide.",
      "Photos you upload: reference pictures of items and proof of payment.",
      "Delivery information: proof-of-delivery photos and, when you track a delivery, the rider's shared location.",
      "Device and notification data: your device's push-notification token so we can send you order updates (only if you allow notifications).",
      "Communications: messages you send us through the contact form, WhatsApp, or email.",
    ],
  },
  {
    title: "3. How We Use Your Information",
    body: [
      "To place and manage your orders, and to buy the items you request.",
      "To contact you about your order by email, WhatsApp, in-app messages, or push notifications.",
      "To arrange delivery and let you track your rider.",
      "To confirm payments you have made and keep records of your orders.",
      "To improve our service and respond to your questions or complaints.",
    ],
  },
  {
    title: "4. Who We Share Your Information With",
    body: [
      "Our staff: managers and riders see the order details, delivery address, and contact number they need to process and deliver your order.",
      "Service providers: we use trusted providers to run our app, store data, send emails, and send WhatsApp messages (for example, our cloud hosting, email, and WhatsApp Business providers).",
      "We do not sell your personal information to anyone.",
      "We may disclose information if required by law or to protect our rights.",
    ],
  },
  {
    title: "5. Payment Information",
    body: [
      "We do not process payments inside the app. You pay through bank transfer or the method agreed with our team, and upload proof of payment. We store only the proof you upload so we can verify your order.",
      "Never send us more bank or card details than needed to complete your payment.",
    ],
  },
  {
    title: "6. How Long We Keep Your Information",
    body: [
      "We keep your account and order information while your account is active and afterwards, for as long as needed to service your orders, keep records, and meet legal requirements.",
      "You may ask us to delete your account and personal information by contacting us; we will keep only what we must retain by law.",
    ],
  },
  {
    title: "7. How We Protect Your Information",
    body: [
      "Your data is stored with our cloud provider, which uses encryption in transit and at rest, and access inside our team is limited to staff who need it for their work.",
      "No method of storage or transmission is perfectly secure, so please use a strong password for your account and contact us if you notice anything suspicious.",
    ],
  },
  {
    title: "8. Your Choices",
    body: [
      "Notifications: you can turn order notifications on or off any time in the app's notification settings, or in your phone's settings.",
      "Profile details: you can update your name and phone number and change your password on the Profile page.",
      "Marketing: we only send you messages related to your orders and our service. If you ever receive something you do not want, tell us and we will stop.",
    ],
  },
  {
    title: "9. Children",
    body: [
      "Our service is not intended for children under 13, and we do not knowingly collect their information. If you believe a child has given us information, please contact us and we will remove it.",
    ],
  },
  {
    title: "10. Changes to This Policy",
    body: [
      "We may update this policy from time to time. The latest version is always on this page, and the date below shows when it was last updated.",
    ],
  },
  {
    title: "11. Contact Us",
    body: [
      "Questions about this policy or your information? Write to contact@tabedaar.com or send us a message on WhatsApp.",
      "You can also reach us at our office: IP Building, Gulberg, Lahore, Pakistan.",
    ],
  },
];

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 py-12">
        <div className="container mx-auto px-4 max-w-3xl">
          <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
          <p className="text-muted-foreground text-sm mb-8">Last updated: 31 October 2026</p>

          <div className="space-y-8">
            {sections.map((section) => (
              <section key={section.title}>
                <h2 className="text-xl font-semibold mb-3">{section.title}</h2>
                <div className="space-y-3">
                  {section.body.map((paragraph, i) => (
                    <p key={i} className="text-sm leading-relaxed text-foreground/80">
                      {paragraph}
                    </p>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      </main>

      <Footer />
      <AIBotButton />
    </div>
  );
};

export default PrivacyPolicy;
