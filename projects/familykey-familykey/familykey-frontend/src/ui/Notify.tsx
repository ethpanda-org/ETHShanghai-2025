import React, { useEffect, useState } from 'react';
import { useI18n } from './i18n';

export default function Notify() {
  const { t } = useI18n();
  const [email, setEmail] = useState('');
  const [enabled, setEnabled] = useState(true);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    setEmail(localStorage.getItem('fk.reminderEmail') || '');
    setEnabled((localStorage.getItem('fk.notifyEnabled') || '1') === '1');
  }, []);

  function save() {
    localStorage.setItem('fk.reminderEmail', email);
    localStorage.setItem('fk.notifyEnabled', enabled ? '1' : '0');
    setMsg('Notification settings saved.');
  }

  return (
    <div className="container">
      <div className="card">
        <div className="section-title">{t('notifications_title')}</div>
        <p className="muted" style={{ marginBottom: 12 }}>{t('notifications_desc')}</p>
        <div className="form-row">
          <label className="label">{t('reminder_email')}</label>
          <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Settlor@example.com" />
        </div>
        <div className="row" style={{ marginBottom: 12 }}>
          <label className="label" style={{ marginRight: 8 }}>Enable notifications</label>
          <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
        </div>
        <div className="row"><button className="btn" onClick={save}>{t('save_settings')}</button></div>
        {msg && <pre style={{ marginTop: 8 }}>{msg}</pre>}
      </div>
    </div>
  );
}