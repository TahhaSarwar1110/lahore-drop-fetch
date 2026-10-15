import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { AIBotButton } from "@/components/AIBotButton";
import { Button } from "@/components/ui/button";
import { Mail } from "lucide-react";
import { Link } from "react-router-dom";

const deletionEmail = `mailto:contact@tabedaar.com?subject=${encodeURIComponent("Tabedaar.com account and data deletion request")}&body=${encodeURIComponent("Hello Tabedaar team,\n\nI would like to request deletion of my account and associated personal data.\n\nRegistered email address:\nName:\n\nPlease confirm once my request has been reviewed and processed.\nThank you.")}`;

const DataDeletion = () => (
  <div className="min-h-screen flex flex-col">
    <Header />
    <main className="flex-1 py-12">
      <div className="container mx-auto px-4 max-w-3xl">
        <h1 className="text-3xl font-bold mb-2">Data Deletion</h1>
        <p className="text-muted-foreground text-sm mb-8">Last updated: 15 October 2026</p>
        <div className="space-y-8 text-sm leading-relaxed text-foreground/80">
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">Request Account or Personal Data Deletion</h2>
            <p>You can request deletion of your Tabedaar.com account and associated personal information, whether you use our website, Android app, or iPhone app. You do not need to sign in to access these instructions.</p>
            <ol className="list-decimal pl-5 space-y-3 mt-4">
              <li>Email <a href="mailto:contact@tabedaar.com" className="text-primary underline underline-offset-4 break-all">contact@tabedaar.com</a>, preferably from the email address registered to your account.</li>
              <li>Use the subject “Tabedaar.com account and data deletion request” and include your name and registered email address.</li>
              <li>State whether you want your entire account deleted or only specific personal information removed. Do not include your password, payment credentials, or unnecessary identity documents.</li>
            </ol>
            <Button asChild className="mt-5 gap-2 max-w-full whitespace-normal h-auto min-h-10 py-2">
              <a href={deletionEmail}><Mail className="h-4 w-4 shrink-0" />Email a Deletion Request</a>
            </Button>
            <p className="mt-3 text-muted-foreground">Your request is submitted when you send the email. Opening the email link does not delete your account.</p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">What Happens Next</h2>
            <p>Our team will review your request and may ask you to verify that you own the account before removing information. We will contact you about any information needed, any records that must be retained, and the outcome of your request. If you cannot access your registered email, contact us to discuss verification.</p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">Information Covered by Your Request</h2>
            <p>An account deletion request covers your account profile and associated personal information, including your name, phone number, delivery addresses, uploaded photos and payment proof, notification preferences, device notification registrations, and communications, subject to the retention requirements below.</p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">Records We May Need to Retain</h2>
            <p>Some order, transaction, or communication records may need to be retained to complete outstanding orders, resolve disputes, prevent fraud, or meet legal and recordkeeping obligations. We retain these records only for as long as needed for those purposes and will explain any applicable exceptions when responding to your request.</p>
            <p className="mt-3">Deleting your account does not automatically cancel an active order or settle outstanding payments. Contact our team about those separately. Messages or records already held by external services, such as your own email or WhatsApp account, are also subject to those services' controls.</p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">Questions About Your Data</h2>
            <p>Read our <Link to="/privacy" className="text-primary underline underline-offset-4">Privacy Policy</Link> for more information about how we collect and use personal information. For help with a deletion request, write to <a href="mailto:contact@tabedaar.com" className="text-primary underline underline-offset-4 break-all">contact@tabedaar.com</a>.</p>
            <p className="mt-3">Tabedaar.com — IP Building, Gulberg, Lahore, Pakistan.</p>
          </section>
        </div>
      </div>
    </main>
    <Footer />
    <AIBotButton />
  </div>
);

export default DataDeletion;