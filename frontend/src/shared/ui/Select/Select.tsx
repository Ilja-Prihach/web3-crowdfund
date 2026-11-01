"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";

import { getNextOptionIndex } from "./selectNavigation";
import styles from "./Select.module.scss";

export type SelectOption<Value extends string> = {
  value: Value;
  label: string;
};

type SelectProps<Value extends string> = {
  ariaLabel: string;
  className?: string;
  onChange: (value: Value) => void;
  options: readonly SelectOption<Value>[];
  value: Value;
};

export function Select<Value extends string>({ ariaLabel, className, onChange, options, value }: SelectProps<Value>) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedIndex = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  );
  const [activeIndex, setActiveIndex] = useState(selectedIndex);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const id = useId();
  const listboxId = `${id}-listbox`;

  useEffect(() => {
    if (!isOpen) return;

    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setIsOpen(false);
    };

    document.addEventListener("pointerdown", closeOnOutsidePointer);
    return () => document.removeEventListener("pointerdown", closeOnOutsidePointer);
  }, [isOpen]);

  const open = () => {
    setActiveIndex(selectedIndex);
    setIsOpen(true);
  };

  const choose = (index: number) => {
    const option = options[index];
    if (!option) return;
    onChange(option.value);
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (!isOpen) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(event.key)) {
        event.preventDefault();
        open();
      }
      return;
    }

    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => getNextOptionIndex(index, options.length, event.key === "ArrowDown" ? 1 : -1));
    } else if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      setActiveIndex(event.key === "Home" ? 0 : options.length - 1);
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      choose(activeIndex);
    } else if (event.key === "Escape") {
      event.preventDefault();
      setIsOpen(false);
    } else if (event.key === "Tab") {
      setIsOpen(false);
    }
  };

  const selectedOption = options[selectedIndex];

  return (
    <div className={[styles.root, className].filter(Boolean).join(" ")} ref={rootRef}>
      <button
        aria-activedescendant={isOpen ? `${id}-option-${activeIndex}` : undefined}
        aria-controls={listboxId}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label={`${ariaLabel}: ${selectedOption?.label ?? ""}`}
        className={styles.trigger}
        onClick={() => (isOpen ? setIsOpen(false) : open())}
        onKeyDown={handleKeyDown}
        ref={triggerRef}
        role="combobox"
        type="button"
      >
        <span>{selectedOption?.label}</span>
        <span aria-hidden="true" className={styles.chevron} />
      </button>

      {isOpen ? (
        <div aria-label={ariaLabel} className={styles.menu} id={listboxId} role="listbox">
          {options.map((option, index) => (
            <div
              aria-selected={option.value === value}
              className={styles.option}
              data-active={index === activeIndex || undefined}
              id={`${id}-option-${index}`}
              key={option.value}
              onClick={() => choose(index)}
              onMouseEnter={() => setActiveIndex(index)}
              onPointerDown={(event) => event.preventDefault()}
              role="option"
            >
              <span aria-hidden="true" className={styles.check}>
                {option.value === value ? "✓" : ""}
              </span>
              <span>{option.label}</span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
