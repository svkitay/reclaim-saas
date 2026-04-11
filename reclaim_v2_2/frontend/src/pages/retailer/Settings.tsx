import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../utils/api";
import toast from "react-hot-toast";

interface SettingsForm {
  store_name: string;
  sender_name: string;
  sender_email: string;
  store_website: string;
  store_phone: string;
  brevo_api_key: string;
  twilio_account_sid: string;
  twilio_auth_token: string;
  twilio_phone_number: string;
  anthropic_api_key: string;
}

export default function Settings() {
  const { user, refreshUser } = useAuth();
  const [form, setForm] = useState<SettingsForm>({
    store_name: "",
    sender_name: "",
    sender_email: "",
    store_website: "",
    store_phone: "",
    brevo_api_key: "",
    twilio_account_sid: "",
    twilio_auth_token: "",
    twilio_phone_number: "",
    anthropic_api_key: "",
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (user) {
      setForm({
        store_name: user.store_name || "",
        sender_name: (user as any).sender_name || "",
        sender_email: (user as any).sender_email || "",
        store_website: (user as any).store_website || "",
        store_phone: (user as any).store_phone || "",
        brevo_api_key: "",
        twilio_account_sid: "",
        twilio_auth_token: "",
        twilio_phone_number: "",
        anthropic_api_key: "",
      });
    }
  }, [user]);

  const handleChange = (field: keyof SettingsForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const payload: any = {};
      Object.entries(form).forEach(([key, val]) => {
        if (val !== "") payload[key] = val;
      });
      await api.updateSettings(payload);
      await refreshUser();
      setSaved(true);
      // If sender email was changed, show a prompt about verification
      const newEmail = payload.sender_email;
      const oldEmail = (user as any)?.sender_email;
      if (newEmail && newEmail !== oldEmail) {
        toast.success(`Verification email sent to ${newEmail} — check your inbox and click the link.`, { duration: 6000 });
      }
    } catch (e: any) {
      setError(e.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmVerified = async () => {
    setVerifying(true);
    try {
      const result = await api.confirmSenderVerified();
      if (result.verified) {
        await refreshUser();
        toast.success("Sender email verified! Your emails will now go out from your own address.");
      } else {
        toast.error(result.message || "Not verified yet — please click the link in the email from Brevo.");
      }
    } catch (e: any) {
      toast.error(e.message || "Could not check verification status.");
    } finally {
      setVerifying(false);
    }
  };

  const handleResendVerification = async () => {
    setResending(true);
    try {
      const result = await api.resendSenderVerification();
      toast.success(result.message || "Verification email resent.");
    } catch (e: any) {
      toast.error(e.message || "Could not resend verification email.");
    } finally {
      setResending(false);
    }
  };

  const senderEmailVerified = (user as any)?.sender_email_verified;
  const senderEmail = (user as any)?.sender_email;

  const Field = ({ label, field, type = "text", placeholder, hint }: {
    label: string; field: keyof SettingsForm; type?: string; placeholder?: string; hint?: string;
  }) => (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      <input
        type={type}
        value={form[field]}
        onChange={(e) => handleChange(field, e.target.value)}
        placeholder={placeholder}
        className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent text-sm"
      />
      {hint && <p className="text-xs text-slate-400 mt-1">{hint}</p>}
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Store Settings</h1>
        <p className="text-slate-500 text-sm mt-1">Configure your store profile and integrations</p>
      </div>

      {/* Store Info */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 mb-6">
        <h2 className="text-base font-semibold text-slate-800 mb-4">Store Information</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Store Name" field="store_name" placeholder="Ashley Furniture – Downtown" />
          <Field label="Sender Name" field="sender_name" placeholder="Ashley Furniture" hint="Name customers see in their inbox" />
          <Field label="Store Phone" field="store_phone" placeholder="+1 (555) 000-0000" />
          <Field label="Store Website" field="store_website" placeholder="https://ashleyfurniture.com" />
        </div>
      </div>

      {/* Sender Email — with verification flow */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 mb-6">
        <div className="flex items-start justify-between mb-1">
          <div>
            <h2 className="text-base font-semibold text-slate-800">Sender Email Address</h2>
            <p className="text-sm text-slate-500 mt-0.5">
              Emails to your customers will appear to come from this address
            </p>
          </div>
          {senderEmail && (
            <span className={`text-xs px-2 py-1 rounded-full font-medium whitespace-nowrap ml-4 ${
              senderEmailVerified
                ? "bg-green-100 text-green-700"
                : "bg-amber-100 text-amber-700"
            }`}>
              {senderEmailVerified ? "✓ Verified" : "Pending verification"}
            </span>
          )}
        </div>

        <div className="mt-4 space-y-4">
          <Field
            label="Sender Email"
            field="sender_email"
            type="email"
            placeholder="hello@yourstorename.com"
            hint="Save settings to trigger a verification email to this address"
          />
        </div>

        {/* Verification instructions — shown when email is set but not yet verified */}
        {senderEmail && !senderEmailVerified && (
          <div className="mt-4 p-4 rounded-lg bg-amber-50 border border-amber-200">
            <p className="text-sm font-medium text-amber-800 mb-1">Verification required</p>
            <p className="text-sm text-amber-700 mb-3">
              A verification email was sent to <strong>{senderEmail}</strong> from Brevo.
              Open that email and click the confirmation link, then click the button below.
            </p>
            <div className="flex gap-3 flex-wrap">
              <button
                onClick={handleConfirmVerified}
                disabled={verifying}
                className="px-4 py-2 rounded-lg bg-amber-600 text-white text-sm font-medium hover:bg-amber-700 disabled:opacity-60 transition-colors"
              >
                {verifying ? "Checking..." : "I've clicked the link — verify now"}
              </button>
              <button
                onClick={handleResendVerification}
                disabled={resending}
                className="px-4 py-2 rounded-lg bg-white border border-amber-300 text-amber-700 text-sm font-medium hover:bg-amber-50 disabled:opacity-60 transition-colors"
              >
                {resending ? "Sending..." : "Resend verification email"}
              </button>
            </div>
          </div>
        )}

        {/* Verified state */}
        {senderEmail && senderEmailVerified && (
          <div className="mt-4 p-3 rounded-lg bg-green-50 border border-green-200 text-sm text-green-700">
            Your customers' emails are being sent from <strong>{senderEmail}</strong>.
            To change it, enter a new address above and save.
          </div>
        )}

        {/* No email set yet */}
        {!senderEmail && (
          <div className="mt-4 p-3 rounded-lg bg-slate-50 border border-slate-200 text-sm text-slate-600">
            Until you set and verify a sender email, your customers' emails will be sent from the
            Reclaim platform address. Add your store email above to brand the emails as coming from you.
          </div>
        )}
      </div>

      {/* Email Integration */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold text-slate-800">Email Integration (Brevo)</h2>
            <p className="text-sm text-slate-500 mt-0.5">Optional — connect your own Brevo account for advanced sending control</p>
          </div>
          <span className={`text-xs px-2 py-1 rounded-full font-medium ${user?.has_brevo ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}>
            {user?.has_brevo ? "✓ Connected" : "Optional"}
          </span>
        </div>
        <div className="space-y-4">
          <Field
            label="Brevo API Key"
            field="brevo_api_key"
            type="password"
            placeholder={user?.has_brevo ? "••••••••••••• (saved)" : "Enter your Brevo API key"}
            hint="Leave blank to use the platform's shared Brevo account"
          />
        </div>
      </div>

      {/* SMS Integration */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold text-slate-800">SMS Integration (Twilio)</h2>
            <p className="text-sm text-slate-500 mt-0.5">Optional — enables SMS touchpoints to your customers</p>
          </div>
          <span className={`text-xs px-2 py-1 rounded-full font-medium ${user?.has_twilio ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}>
            {user?.has_twilio ? "✓ Connected" : "Optional"}
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field
            label="Twilio Account SID"
            field="twilio_account_sid"
            type="password"
            placeholder={user?.has_twilio ? "••••••••• (saved)" : "ACxxxxxxxxxxxxxxxx"}
          />
          <Field
            label="Twilio Auth Token"
            field="twilio_auth_token"
            type="password"
            placeholder={user?.has_twilio ? "••••••••• (saved)" : "Your auth token"}
          />
          <Field
            label="Twilio Phone Number"
            field="twilio_phone_number"
            placeholder="+15550001234"
            hint="The number SMS will be sent from"
          />
        </div>
      </div>

      {/* AI Integration */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold text-slate-800">AI Message Generation (Claude)</h2>
            <p className="text-sm text-slate-500 mt-0.5">Optional — connect your own Anthropic key for dedicated AI usage</p>
          </div>
          <span className={`text-xs px-2 py-1 rounded-full font-medium ${user?.has_anthropic ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}>
            {user?.has_anthropic ? "✓ Connected" : "Optional"}
          </span>
        </div>
        <Field
          label="Anthropic API Key"
          field="anthropic_api_key"
          type="password"
          placeholder={user?.has_anthropic ? "••••••••• (saved)" : "sk-ant-..."}
          hint="Leave blank to use the platform's shared AI account"
        />
      </div>

      {/* Save Button */}
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
      )}
      {saved && (
        <div className="mb-4 p-3 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm">Settings saved successfully!</div>
      )}
      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full py-3 rounded-xl text-white font-medium text-sm transition-opacity disabled:opacity-60"
        style={{ background: "#0EA5E9" }}
      >
        {saving ? "Saving..." : "Save Settings"}
      </button>
    </div>
  );
}
