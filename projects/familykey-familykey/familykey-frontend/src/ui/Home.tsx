import React from 'react';
import Logo from './Logo';
import { useI18n } from './i18n';

export default function Home({ go }: { go: (view: 'Owner' | 'beneficiary') => void }) {
  const { t, lang } = useI18n();
  return (
    <>
      {/* Hero shares the page with header; content left-centered, image on right */}
      <div className="container section-page hero-section">
        <div className="hero-content">
          <div className="hero-text">
            {/* <div className="hero-logo"><Logo variant="full" /></div> */}
            <div className="section-title title-xl">{t('hero_title')}</div>
            <p className="muted" style={{ marginBottom: 12 }}>{t('hero_sub')}</p>
            <div className="row">
              <button className="btn btn-gold" onClick={() => go('Owner')}>{t('hero_cta_Owner')}</button>
              <button className="btn" onClick={() => go('beneficiary')}>{t('hero_cta_beneficiary')}</button>
              <button className="btn btn-doc" onClick={() => { window.location.href = '/deck.html'; }}>
                <span className="icon-doc" aria-hidden="true">📄</span>
                {t('view_project_intro')}
              </button>
            </div>
          </div>
          <img src="/family_together3.png" alt={lang === 'zh' ? '家庭插画' : 'Family illustration'} className="hero-image" />
        </div>
      </div>

      {/* Cases section moved before Why section */}
      <div className="container section-page">
        <div className="section-logo"><Logo variant="mark" /></div>
        <div className="section-title centered title-xl">{t('home_cases_title')}</div>
        <p className="centered-subtitle">{t('home_cases_sub')}</p>
        <div className="cards-grid-3">
          <div className="card case-card">
            <div className="case-image-frame">
              <img src="/MELLON.png" alt={t('home_case_mellon_name')} className="case-image" />
            </div>
            <div className="case-title">{t('home_case_mellon_name')}</div>
            <p className="case-desc">{t('home_case_mellon_desc')}</p>
          </div>
          <div className="card case-card">
            <div className="case-image-frame">
              <img src="/Popescu.png" alt={t('home_case_popescu_name')} className="case-image" />
            </div>
            <div className="case-title">{t('home_case_popescu_name')}</div>
            <p className="case-desc">{t('home_case_popescu_desc')}</p>
          </div>
          <div className="card case-card">
            <div className="case-image-frame">
              <img src="/Moody.png" alt={t('home_case_moody_name')} className="case-image" />
            </div>
            <div className="case-title">{t('home_case_moody_name')}</div>
            <p className="case-desc">{t('home_case_moody_desc')}</p>
          </div>
        </div>
      </div>

      {/* Why section moved after Cases section */}
      <div className="container section-page">
        <div className="section-logo"><Logo variant="mark" /></div>
        <div className="section-title centered title-xl">{t('home_why_title')}</div>
        <p className="centered-subtitle">{t('home_why_sub')}</p>
        <div className="cards-grid-3">
          <div className="card why-card">
            <svg className="why-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 2l7 3v5c0 5-4 9-7 10-3-1-7-5-7-10V5l7-3z" fill="none" stroke="currentColor" strokeWidth="1.8" />
              <path d="M9 12l2 2 4-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <p className="why-desc">{t('home_why_point_1')}</p>
          </div>
          <div className="card why-card">
            <svg className="why-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" fill="none" stroke="currentColor" strokeWidth="1.8" />
              <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" strokeWidth="1.8" />
              <path d="M3 3l18 18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
            <p className="why-desc">{t('home_why_point_3')}</p>
          </div>
          <div className="card why-card">
            <svg className="why-icon" viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.8" />
              <ellipse cx="12" cy="12" rx="5" ry="9" fill="none" stroke="currentColor" strokeWidth="1.8" />
              <path d="M3 12h18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
            <p className="why-desc">{t('home_why_point_4')}</p>
          </div>
        </div>
      </div>
    </>
  );
}