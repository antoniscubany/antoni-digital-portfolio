'use client';

import * as React from 'react';
import { ThemeProvider as NextThemesProvider } from 'next-themes';

type Language = 'en' | 'pl';

interface LanguageContextType {
    language: Language;
    setLanguage: (lang: Language) => void;
    t: (key: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
    en: {
        'app.title': 'Sonic',
        'app.subtitle': 'Predictive Audio Diagnostic',
        'btn.tapToScan': 'Tap to Scan',
        'btn.listening': 'Listening...',
        'btn.processing': 'Analyzing Audio...',
        'settings.title': 'Diagnostic Settings',
        'settings.category': 'Machine Category',
        'settings.make': 'Make & Model (Optional)',
        'settings.symptoms': 'Observed Symptoms (Optional)',
        'settings.save': 'Save Settings',
        'settings.ready': 'Ready to Scan',
        'cat.auto': 'Auto',
        'cat.home': 'Home',
        'cat.industrial': 'Industrial',
        'report.title': 'Diagnostic Result',
        'report.severity': 'Severity',
        'report.confidence': 'Confidence',
        'report.source': 'Source',
        'report.signature': 'Acoustic Signature',
        'report.cost': 'Estimated Cost',
        'report.action': 'Recommended Action',
        'report.newScan': 'New Scan',
        'report.error': 'Analysis Failed',
        'theme.light': 'Light Mode',
        'theme.dark': 'Dark Mode',
        'lang.en': 'English',
        'lang.pl': 'Polski'
    },
    pl: {
        'app.title': 'Sonic',
        'app.subtitle': 'Predykcyjna Diagnostyka Audio',
        'btn.tapToScan': 'Dotknij, aby Skanować',
        'btn.listening': 'Nasłuchiwanie...',
        'btn.processing': 'Analiza Dźwięku...',
        'settings.title': 'Ustawienia Diagnostyki',
        'settings.category': 'Kategoria Maszyny',
        'settings.make': 'Marka i Model (Opcjonalnie)',
        'settings.symptoms': 'Zaobserwowane Objawy (Opcjonalnie)',
        'settings.save': 'Zapisz Ustawienia',
        'settings.ready': 'Gotowy do Skanowania',
        'cat.auto': 'Motoryzacja',
        'cat.home': 'AGD',
        'cat.industrial': 'Przemysł',
        'report.title': 'Wynik Diagnostyki',
        'report.severity': 'Priorytet',
        'report.confidence': 'Pewność',
        'report.source': 'Źródło',
        'report.signature': 'Sygnatura Akustyczna',
        'report.cost': 'Szacowany Koszt',
        'report.action': 'Zalecane Działanie',
        'report.newScan': 'Nowy Skan',
        'report.error': 'Analiza Nie Powiodła Się',
        'theme.light': 'Tryb Jasny',
        'theme.dark': 'Tryb Ciemny',
        'lang.en': 'English',
        'lang.pl': 'Polski'
    }
};

const LanguageContext = React.createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
    const [language, setLanguage] = React.useState<Language>('en');

    // Load language from localStorage if available
    React.useEffect(() => {
        const savedLang = localStorage.getItem('sonic_lang') as Language;
        if (savedLang && ['en', 'pl'].includes(savedLang)) {
            setLanguage(savedLang);
        } else {
            // Try to detect browser language
            if (navigator.language.startsWith('pl')) {
                setLanguage('pl');
            }
        }
    }, []);

    const handleSetLanguage = (lang: Language) => {
        setLanguage(lang);
        localStorage.setItem('sonic_lang', lang);
    };

    const t = (key: string): string => {
        return translations[language]?.[key] || translations['en'][key] || key;
    };

    return (
        <LanguageContext.Provider value={{ language, setLanguage: handleSetLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    );
}

export function useLanguage() {
    const context = React.useContext(LanguageContext);
    if (context === undefined) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
}

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <NextThemesProvider attribute="class" defaultTheme="system" enableSystem>
            <LanguageProvider>
                {children}
            </LanguageProvider>
        </NextThemesProvider>
    );
}
