'use client';

import { useState } from 'react';
import { ArrowRight, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

type FormType = 'beta' | 'contact';

const WEB3FORMS_ACCESS_KEY = 'f7b3217c-7663-4d0d-8bf4-52d7ab7abdd7';

export default function BetaForm() {
  const [formType, setFormType] = useState<FormType>('beta');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    telegram: '',
    message: '',
    device: 'ios',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const submitData = new FormData();
      submitData.append('access_key', WEB3FORMS_ACCESS_KEY);
      submitData.append('subject', formType === 'beta' 
        ? `[Beta] New signup from ${formData.name}` 
        : `[Contact] Message from ${formData.name}`);
      submitData.append('name', formData.name);
      submitData.append('email', formData.email);
      
      if (formType === 'beta') {
        submitData.append('telegram', formData.telegram || 'Not provided');
        submitData.append('device', formData.device);
        submitData.append('form_type', 'Beta Signup');
      } else {
        submitData.append('message', formData.message);
        submitData.append('form_type', 'Contact Request');
      }

      const response = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        body: submitData,
      });
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error('Failed to submit');
      }
      
      setSuccess(true);
      setFormData({ name: '', email: '', telegram: '', message: '', device: 'ios' });
    } catch (err) {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <section id="beta" className="relative py-32 px-6">
        <div className="max-w-md mx-auto text-center">
          <div className="border border-white/10 rounded-lg p-12 bg-white/[0.02]">
            <CheckCircle size={32} className="text-white/40 mx-auto mb-6" strokeWidth={1} />
            <h3 className="text-xl font-medium text-white mb-3">Thank you</h3>
            <p className="text-sm text-white/40 mb-8">
              {formType === 'beta' 
                ? "You've been added to our beta waitlist."
                : "We've received your message."}
            </p>
            <button 
              onClick={() => setSuccess(false)}
              className="btn-secondary text-sm"
            >
              SUBMIT ANOTHER
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="beta" className="relative py-32 px-6">
      <div className="max-w-xl mx-auto">
        <div className="text-center mb-12">
          <p className="text-xs uppercase tracking-widest mb-4" style={{ color: 'var(--text-secondary)' }}>JOIN US</p>
          <h2 className="text-3xl md:text-4xl font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
            Get early access
          </h2>
          <p className="text-body">
            Join our beta program or reach out to our team.
          </p>
        </div>
        
        {/* Form Type Toggle - Minimal */}
        <div className="flex justify-center gap-2 mb-10">
          <button
            onClick={() => setFormType('beta')}
            className={`px-4 py-2 rounded text-sm font-medium transition-all ${
              formType === 'beta' 
                ? 'bg-white text-black' 
                : 'text-white/40 hover:text-white'
            }`}
          >
            Join Beta
          </button>
          <button
            onClick={() => setFormType('contact')}
            className={`px-4 py-2 rounded text-sm font-medium transition-all ${
              formType === 'contact' 
                ? 'bg-white text-black' 
                : 'text-white/40 hover:text-white'
            }`}
          >
            Contact
          </button>
        </div>
        
        <div className="border rounded-lg p-8" style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid md:grid-cols-2 gap-5">
              <div>
                <label className="block text-white/40 mb-2 text-xs uppercase tracking-wider">Name</label>
                <input
                  type="text"
                  required
                  className="input-field"
                  placeholder="Your name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-white/40 mb-2 text-xs uppercase tracking-wider">Email</label>
                <input
                  type="email"
                  required
                  className="input-field"
                  placeholder="your@email.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
            </div>
            
            {formType === 'beta' && (
              <>
                <div>
                  <label className="block text-white/40 mb-2 text-xs uppercase tracking-wider">Telegram (optional)</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="@username"
                    value={formData.telegram}
                    onChange={(e) => setFormData({ ...formData, telegram: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-white/40 mb-2 text-xs uppercase tracking-wider">Device</label>
                  <div className="flex gap-6">
                    {['ios', 'android', 'both'].map((device) => (
                      <label key={device} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="device"
                          value={device}
                          checked={formData.device === device}
                          onChange={(e) => setFormData({ ...formData, device: e.target.value })}
                          className="w-3 h-3 accent-white"
                        />
                        <span className="text-white/50 text-sm capitalize">{device}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </>
            )}
            
            {formType === 'contact' && (
              <div>
                <label className="block text-white/40 mb-2 text-xs uppercase tracking-wider">Message</label>
                <textarea
                  required
                  rows={4}
                  className="input-field resize-none"
                  placeholder="How can we help you?"
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                />
              </div>
            )}
            
            {error && (
              <div className="flex items-center gap-2 text-red-400 text-sm">
                <AlertCircle size={14} />
                {error}
              </div>
            )}
            
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {loading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <>
                  {formType === 'beta' ? 'JOIN WAITLIST' : 'SEND MESSAGE'}
                  <ArrowRight size={14} />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
