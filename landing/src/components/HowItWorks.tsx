'use client';

const steps = [
  {
    number: '01',
    title: 'Download',
    description: 'Get E-Y from App Store or Google Play.',
  },
  {
    number: '02',
    title: 'Create wallet',
    description: 'Generate new or import existing with seed phrase.',
  },
  {
    number: '03',
    title: 'Claim @username',
    description: 'Your unique identity for receiving crypto.',
  },
  {
    number: '04',
    title: 'Start sending',
    description: 'Send to @usernames, earn Shards.',
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="relative py-32 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-20">
          <p className="text-xs uppercase tracking-widest mb-4" style={{ color: 'var(--text-secondary)' }}>HOW IT WORKS</p>
          <h2 className="text-3xl md:text-4xl font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
            Get started in minutes
          </h2>
          <p className="text-body max-w-xl mx-auto">
            No complicated setup. No technical knowledge required.
          </p>
        </div>
        
        <div className="grid md:grid-cols-4 gap-8">
          {steps.map((step, index) => (
            <div key={index} className="text-center">
              <div className="text-5xl font-light mb-4" style={{ color: 'var(--text-muted)' }}>{step.number}</div>
              <h3 className="text-lg font-medium mb-2" style={{ color: 'var(--text-primary)' }}>{step.title}</h3>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{step.description}</p>
            </div>
          ))}
        </div>
      </div>
      
      {/* Divider */}
      <div className="divider mt-32 max-w-4xl mx-auto" />
    </section>
  );
}
