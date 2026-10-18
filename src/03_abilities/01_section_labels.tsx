import React from 'react';
import { useTranslation } from '../99_settings/language';

export function StarbornLabel() {
  const { t } = useTranslation();
  return (
    <span className="font-serif text-[9px] font-bold uppercase tracking-wide text-stone-200 underline decoration-white/50 underline-offset-3 drop-shadow-[0_0_4px_rgba(255,255,255,0.45)] select-none">
      {t("Starborn")}
    </span>
  );
}

export function CompendiumLabel() {
  const { t } = useTranslation();
  return (
    <span className="font-serif text-[9px] font-bold uppercase tracking-wide text-stone-200 underline decoration-white/50 underline-offset-3 drop-shadow-[0_0_4px_rgba(255,255,255,0.45)] select-none">
      {t("Compendium")}
    </span>
  );
}

export function JournalLabel() {
  const { t } = useTranslation();
  return (
    <span className="font-serif text-[9px] font-bold uppercase tracking-wide text-stone-200 underline decoration-white/50 underline-offset-3 drop-shadow-[0_0_4px_rgba(255,255,255,0.45)] select-none">
      {t("Journal")}
    </span>
  );
}

export function InventoryLabel() {
  const { t } = useTranslation();
  return (
    <span className="font-serif text-[9px] font-bold uppercase tracking-wide text-stone-200 underline decoration-white/50 underline-offset-3 drop-shadow-[0_0_4px_rgba(255,255,255,0.45)] select-none">
      {t("Inventory")}
    </span>
  );
}

export function WeaponsLabel() {
  const { t } = useTranslation();
  return (
    <span className="font-serif text-[9px] font-bold uppercase tracking-wide text-stone-200 underline decoration-white/50 underline-offset-3 drop-shadow-[0_0_4px_rgba(255,255,255,0.45)] select-none">
      {t("Weapons")}
    </span>
  );
}

export function MagicLabel() {
  const { t } = useTranslation();
  return (
    <span className="font-serif text-[9px] font-bold uppercase tracking-wide text-stone-200 underline decoration-white/50 underline-offset-3 drop-shadow-[0_0_4px_rgba(255,255,255,0.45)] select-none">
      {t("Magic")}
    </span>
  );
}

export function EmptyThreeLabel() {
  return (
    <span className="font-serif text-[9px] font-bold uppercase tracking-wide text-stone-200 underline decoration-white/50 underline-offset-3 drop-shadow-[0_0_4px_rgba(255,255,255,0.45)] select-none">
      03
    </span>
  );
}

export function EmptyFourLabel() {
  return (
    <span className="font-serif text-[9px] font-bold uppercase tracking-wide text-stone-200 underline decoration-white/50 underline-offset-3 drop-shadow-[0_0_4px_rgba(255,255,255,0.45)] select-none">
      04
    </span>
  );
}

export function EmptyFiveLabel() {
  return (
    <span className="font-serif text-[9px] font-bold uppercase tracking-wide text-stone-200 underline decoration-white/50 underline-offset-3 drop-shadow-[0_0_4px_rgba(255,255,255,0.45)] select-none">
      05
    </span>
  );
}

export function TabletopLabel() {
  const { t } = useTranslation();
  return (
    <span className="font-serif text-[9px] font-bold uppercase tracking-wide text-stone-200 underline decoration-white/50 underline-offset-3 drop-shadow-[0_0_4px_rgba(255,255,255,0.45)] select-none">
      {t("Tabletop")}
    </span>
  );
}

export function EmptyEightLabel() {
  return null;
}

export function DiceLabel() {
  const { t } = useTranslation();
  return (
    <span className="font-serif text-[9px] font-bold uppercase tracking-wide text-stone-200 underline decoration-white/50 underline-offset-3 drop-shadow-[0_0_4px_rgba(255,255,255,0.45)] select-none">
      {t("Dice")}
    </span>
  );
}
