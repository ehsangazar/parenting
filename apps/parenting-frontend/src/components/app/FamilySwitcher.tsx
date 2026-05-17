import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppBase } from '../../hooks/useAppBase.js';
import { uiIcons } from '../../lib/iconSemantics.js';
import { Icon } from '../icons/index.js';
import { useAppContext } from './AppContext.js';
import { useNavigate } from 'react-router-dom';

export const FamilySwitcher = ({ collapsed = false }: { collapsed?: boolean }) => {
  const { t } = useTranslation();
  const { toApp } = useAppBase();
  const { families, activeFamily, setActiveFamilyId } = useAppContext();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!activeFamily) return null;

  const initials = activeFamily.name
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className={`relative ${collapsed ? 'px-2' : 'px-3'} py-4 border-b border-border`} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex w-full items-center gap-3 rounded-xl p-2 transition-all hover:bg-surface-light active:scale-[0.98] ${
          collapsed ? 'justify-center' : ''
        }`}
      >
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-primary-500 text-[14px] font-bold text-white shadow-sm ring-2 ring-primary-100 transition-transform">
          {initials}
        </div>
        {!collapsed && (
          <div className="flex flex-1 flex-col items-start overflow-hidden text-left">
            <span className="w-full truncate text-[14px] font-bold text-text-primary leading-tight">
              {activeFamily.name}
            </span>
            <span className="text-[11px] font-medium text-text-tertiary">{t('familySwitcher.familyAccount')}</span>
          </div>
        )}
        {!collapsed && (
          <Icon
            name={uiIcons.chevronDown}
            className={`h-4 w-4 flex-shrink-0 object-contain text-text-tertiary transition-transform duration-300 ${
              isOpen ? 'rotate-180' : ''
            }`}
            alt=""
          />
        )}
      </button>

      {isOpen && (
        <div className={`absolute ${collapsed ? 'left-14 w-[240px]' : 'left-3 right-3'} top-[calc(100%-8px)] z-50 mt-2 flex flex-col overflow-hidden rounded-2xl border-2 border-border bg-surface shadow-xl animate-in fade-in slide-in-from-top-2 duration-200`}>
          <div className="max-h-[280px] overflow-y-auto py-1.5 px-1.5">
            <p className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-text-dimmed">
              {t('familySwitcher.switchFamily')}
            </p>
            <div className="space-y-0.5">
              {families.map((family) => {
                const familyInitials = family.name.split(' ').filter(Boolean).map(n => n[0]).join('').toUpperCase().slice(0, 2);
                const isActive = family.id === activeFamily.id;
                
                return (
                  <button
                    key={family.id}
                    onClick={() => {
                      setActiveFamilyId(family.id);
                      setIsOpen(false);
                    }}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-[13px] transition-colors ${
                      isActive ? 'bg-primary-50 text-primary-fg shadow-sm' : 'text-text-secondary hover:bg-surface-light'
                    }`}
                  >
                    <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-[11px] font-bold text-text-inverse transition-colors ${
                      isActive ? 'bg-primary-500 shadow-inner' : 'bg-border-dark'
                    }`}>
                      {familyInitials}
                    </div>
                    <span className={`flex-1 truncate ${isActive ? 'font-bold' : 'font-medium'}`}>
                      {family.name}
                    </span>
                    {isActive && (
                      <Icon name={uiIcons.check} className="h-4 w-4 flex-shrink-0 object-contain text-primary-600" alt="" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="border-t border-border bg-surface-light/80 p-1.5">
            <button
              onClick={() => {
                navigate(toApp('/app/family'));
                setIsOpen(false);
              }}
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-[13px] font-semibold text-text-secondary hover:bg-background hover:text-primary-700 hover:shadow-sm transition-all"
            >
              <Icon name={uiIcons.plus} className="h-4 w-4 flex-shrink-0 object-contain" alt="" />
              {t('familySwitcher.manageFamilies')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
