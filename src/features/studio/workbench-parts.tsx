import type { KeyboardEvent, MutableRefObject, ReactNode } from "react";

import styles from "./generate-control.module.css";

type Mode = Readonly<{
  description: string;
  icon: string;
  label: string;
  value: "text_to_image" | "image_to_video" | "text_to_speech";
}>;

type PrimaryTabsProps = Readonly<{
  activeMode: Mode["value"];
  modes: readonly Mode[];
  onKeyDown: (event: KeyboardEvent<HTMLButtonElement>, index: number) => void;
  onSelect: (mode: Mode["value"]) => void;
  tabRefs: MutableRefObject<Array<HTMLButtonElement | null>>;
}>;

export function PrimaryTabs({
  activeMode,
  modes,
  onKeyDown,
  onSelect,
  tabRefs,
}: PrimaryTabsProps) {
  return (
    <div className={styles.primaryTabs} role="tablist" aria-label="创作模式">
      {modes.map((mode, index) => (
        <button
          aria-controls={`${mode.value}-panel`}
          aria-selected={activeMode === mode.value}
          className={
            activeMode === mode.value ? styles.primaryTabActive : undefined
          }
          key={mode.value}
          onClick={() => onSelect(mode.value)}
          onKeyDown={(event) => onKeyDown(event, index)}
          ref={(element) => {
            tabRefs.current[index] = element;
          }}
          role="tab"
          id={`${mode.value}-tab`}
          tabIndex={activeMode === mode.value ? 0 : -1}
          type="button"
        >
          <span className={styles.primaryTabIcon} aria-hidden="true">
            {mode.icon}
          </span>
          <span>{mode.label}</span>
          <span className="sr-only">{mode.description}</span>
        </button>
      ))}
    </div>
  );
}

export function WorkbenchShell({
  activeMode,
  children,
}: Readonly<{
  activeMode: Mode["value"];
  children: ReactNode;
}>) {
  return (
    <div className={styles.workbench} data-modality={activeMode}>
      {children}
    </div>
  );
}

export function UploadCard({
  label,
}: Readonly<{
  label: string;
}>) {
  return (
    <div className={styles.uploadCard} aria-hidden="true">
      <span className={styles.uploadCardIcon} aria-hidden="true">
        +
      </span>
      <span className={styles.uploadCardLabel}>{label}</span>
    </div>
  );
}

export function PromptEditor({
  ariaLabel,
  onChange,
  placeholder,
  rows,
  value,
}: Readonly<{
  ariaLabel: string;
  onChange: (value: string) => void;
  placeholder: string;
  rows: number;
  value: string;
}>) {
  return (
    <label className={styles.promptEditor}>
      <span className="sr-only">{ariaLabel}</span>
      <textarea
        aria-label={ariaLabel}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={rows}
        value={value}
      />
    </label>
  );
}

export function CostIndicator({ credits }: Readonly<{ credits: number }>) {
  return (
    <div
      className={styles.costIndicator}
      aria-label={`预计消耗 ${credits} Credits`}
    >
      <span aria-hidden="true">◆</span>
      <strong>{credits}</strong>
    </div>
  );
}

export function GenerateButton({
  disabled,
  onClick,
}: Readonly<{
  disabled: boolean;
  onClick: () => void;
}>) {
  return (
    <button
      aria-label="生成"
      className={styles.generateButton}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      <span aria-hidden="true">↑</span>
    </button>
  );
}

export function BottomToolbar({
  children,
  credits,
  disabled,
  onGenerate,
}: Readonly<{
  children: ReactNode;
  credits: number;
  disabled: boolean;
  onGenerate: () => void;
}>) {
  return (
    <footer className={styles.bottomToolbar}>
      <div className={styles.parameters}>{children}</div>
      <div className={styles.submitArea}>
        <CostIndicator credits={credits} />
        <GenerateButton disabled={disabled} onClick={onGenerate} />
      </div>
    </footer>
  );
}
