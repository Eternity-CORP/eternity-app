'use client';

import { useState } from 'react';
import { Send, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

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
      <section id="beta" className="relative py-24 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <div className="glass-card p-12">
            <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-6">
              <CheckCircle size={48} className="text-green-400" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-4">Thank You!</h3>
            <p className="text-white/60 mb-6">
              {formType === 'beta' 
                ? "You've been added to our beta waitlist. We'll reach out soon!"
                : "We've received your message and will get back to you shortly."}
            </p>
            <button 
              onClick={() => setSuccess(false)}
              className="btn-secondary"
            >
              Submit Another
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="beta" className="relative py-24 px-6">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">
            Ready to <span className="gradient-text">Get Started?</span>
          </h2>
          <p className="text-lg text-white/60 max-w-2xl mx-auto">
            Join our beta program or reach out to our team. We'd love to hear from you.
          </p>
        </div>
        
        {/* Form Type Toggle */}
        <div className="flex justify-center gap-4 mb-8">
          <button
            onClick={() => setFormType('beta')}
            className={`px-6 py-3 rounded-xl font-medium transition-all ${
              formType === 'beta' 
                ? 'bg-[#0098EA] text-white' 
                : 'bg-white/5 text-white/60 hover:bg-white/10'
            }`}
          >
            Join Beta
          </button>
          <button
            onClick={() => setFormType('contact')}
            className={`px-6 py-3 rounded-xl font-medium transition-all ${
              formType === 'contact' 
                ? 'bg-[#0098EA] text-white' 
                : 'bg-white/5 text-white/60 hover:bg-white/10'
            }`}
          >
            Contact Team
          </button>
        </div>
        
        <div className="glass-card p-8 md:p-12">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-white/70 mb-2 text-sm">Name *</label>
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
                <label className="block text-white/70 mb-2 text-sm">Email *</label>
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
                  <label className="block text-white/70 mb-2 text-sm">Telegram (optional)</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="@username"
                    value={formData.telegram}
                    onChange={(e) => setFormData({ ...formData, telegram: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-white/70 mb-2 text-sm">Preferred Device</label>
                  <div className="flex gap-4">
                    {['ios', 'android', 'both'].map((device) => (
                      <label key={device} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="device"
                          value={device}
                          checked={formData.device === device}
                          onChange={(e) => setFormData({ ...formData, device: e.target.value })}
                          className="w-4 h-4 accent-[#0098EA]"
                        />
                        <span className="text-white/70 capitalize">{device}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </>
            )}
            
            {formType === 'contact' && (
              <div>
                <label className="block text-white/70 mb-2 text-sm">Message *</label>
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
                <AlertCircle size={16} />
                {error}
              </div>
            )}
            
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {loading ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <>
                  <Send size={18} />
                  {formType === 'beta' ? 'Join Beta Waitlist' : 'Send Message'}
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
