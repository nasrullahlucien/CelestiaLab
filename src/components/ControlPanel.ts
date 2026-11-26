import {
  formatSliderValue,
  type CoordAccent,
  type SliderSpec,
} from '../data/modules';
import { roundToOneDecimal } from '../astronomy/horizon';
import { i18n } from '../i18n';
import { ICONS } from './Icons';

export interface ControlPanelOptions {
  title?: string;
  sliders: SliderSpec[];
  initialValues?: Record<string, number>;
  onChange: (values: Record<string, number>, changedId: string) => void;
  onReset?: (values: Record<string, number>) => void;
}

export interface ControlPanelHandle {
  element: HTMLElement;
  getValues: () => Record<string, number>;
  setValues: (nextValues: Partial<Record<string, number>>, silent?: boolean) => void;
  reset: () => void;
  destroy: () => void;
}

const ACCENT_BADGE_CLASSES: Record<CoordAccent, string> = {
  horizon: 'bg-horizon-soft text-horizon border-horizon-border',
  equatorial: 'bg-equatorial-soft text-equatorial border-equatorial-border',
  ecliptic: 'bg-ecliptic-soft text-ecliptic border-ecliptic-border',
};

const ACCENT_CSS_VARS: Record<
  CoordAccent,
  { color: string; soft: string; border: string }
> = {
  horizon: {
    color: 'var(--coord-horizon)',
    soft: 'var(--coord-horizon-soft)',
    border: 'var(--coord-horizon-border)',
  },
  equatorial: {
    color: 'var(--coord-equatorial)',
    soft: 'var(--coord-equatorial-soft)',
    border: 'var(--coord-equatorial-border)',
  },
  ecliptic: {
    color: 'var(--coord-ecliptic)',
    soft: 'var(--coord-ecliptic-soft)',
    border: 'var(--coord-ecliptic-border)',
  },
};

function syncSliderCssProps(input: HTMLInputElement): void {
  input.style.setProperty('--attr-min', input.min || '0');
  input.style.setProperty('--attr-max', input.max || '100');
  input.style.setProperty('--control-value', input.value);
}

function linkMessageId(
  el: HTMLInputElement,
  messageId: string,
  shown: boolean
): void {
  const ids = (el.getAttribute('aria-describedby') || '')
    .split(/\s+/)
    .filter((id) => id && id !== messageId);
  if (shown) ids.push(messageId);
  if (ids.length > 0) {
    el.setAttribute('aria-describedby', ids.join(' '));
  } else {
    el.removeAttribute('aria-describedby');
  }
}

function roundByStep(val: number, step: number): number {
  if (step < 0.1) {
    const r = Math.round(val * 100) / 100;
    return Object.is(r, -0) ? 0 : r;
  }
  return roundToOneDecimal(val);
}

function wrapCircular(val: number, min: number, max: number, step = 0.1): number {
  const span = max - min;
  if (span <= 0) return min;
  const wrapped = ((((val - min) % span) + span) % span) + min;
  const rounded = roundByStep(wrapped, step);
  return rounded >= max ? min : rounded;
}

export function createControlPanel(options: ControlPanelOptions): ControlPanelHandle {
  const { sliders, onChange, onReset } = options;
  const values: Record<string, number> = {};
  for (const spec of sliders) {
    const raw = options.initialValues?.[spec.id] ?? spec.defaultValue;
    values[spec.id] = spec.wrapAtMax
      ? wrapCircular(raw, spec.min, spec.max, spec.step)
      : roundByStep(Math.min(spec.max, Math.max(spec.min, raw)), spec.step);
  }

  const root = document.createElement('section');
  root.className =
    'rounded-2xl border border-line bg-surface p-4 sm:p-5 shadow-sm';

  const uidPrefix = `ctrl-${Math.random().toString(36).slice(2, 8)}`;
  const t = i18n.t();
  const vt = t.module.inputValidation;

  // Single polite live announcer for validation notices
  const liveAnnouncer = document.createElement('div');
  liveAnnouncer.className = 'visually-hidden';
  liveAnnouncer.setAttribute('aria-live', 'polite');
  root.appendChild(liveAnnouncer);

  // Header row
  const header = document.createElement('div');
  header.className = 'mb-4 flex flex-wrap items-center justify-between gap-2';

  const heading = document.createElement('h2');
  heading.className = 'text-base font-semibold text-ink';
  heading.textContent = options.title ?? t.module.controlsTitle;

  const resetBtn = document.createElement('button');
  resetBtn.type = 'button';
  resetBtn.className =
    'inline-flex items-center gap-1.5 rounded-xl border border-line bg-subtle px-3 py-1.5 text-xs font-medium text-ink-secondary hover:border-line-strong hover:text-ink transition-colors';
  resetBtn.innerHTML = `${ICONS.reset('w-3.5 h-3.5')}<span>${t.module.controlsReset}</span>`;

  header.append(heading, resetBtn);
  root.appendChild(header);

  const list = document.createElement('div');
  list.className = 'space-y-5';
  root.appendChild(list);

  interface FieldRefs {
    rangeInput: HTMLInputElement;
    readout: HTMLOutputElement;
    numberInput?: HTMLInputElement;
    feedbackEl?: HTMLParagraphElement;
    feedbackId?: string;
    clearFeedback: () => void;
  }

  const fieldRefs = new Map<string, FieldRefs>();

  const formatNumericField = (val: number, step: number): string =>
    step < 0.1 ? roundByStep(val, step).toFixed(2) : roundToOneDecimal(val).toFixed(1);

  for (const spec of sliders) {
    const sliderId = `${uidPrefix}-${spec.id}`;
    const descId = `${sliderId}-desc`;
    const numId = `${sliderId}-num`;
    const feedbackId = `${sliderId}-feedback`;
    const currentValue = values[spec.id];
    const formatted = formatSliderValue(currentValue, spec);
    const labelText = i18n.pick(spec.label);
    const accentVars = ACCENT_CSS_VARS[spec.accent];

    const field = document.createElement('div');
    field.className = 'space-y-2';

    // Label + live numeric readout badge
    const topRow = document.createElement('div');
    topRow.className = 'flex items-baseline justify-between gap-3';

    const label = document.createElement('label');
    label.htmlFor = sliderId;
    label.className = 'text-sm font-semibold text-ink cursor-pointer';
    label.textContent = labelText;

    const readout = document.createElement('output');
    readout.htmlFor = spec.numberInput ? `${sliderId} ${numId}` : sliderId;
    readout.className = `tabular-nums font-mono text-sm font-semibold rounded-lg border px-2.5 py-0.5 shrink-0 ${ACCENT_BADGE_CLASSES[spec.accent]}`;
    readout.textContent = formatted;

    topRow.append(label, readout);

    // Description placed above input so mobile keyboards don't cover hints
    const desc = document.createElement('p');
    desc.id = descId;
    desc.className = 'text-xs text-ink-muted leading-relaxed';
    desc.textContent = i18n.pick(spec.description);

    // Large accessible native range input
    const rangeInput = document.createElement('input');
    rangeInput.type = 'range';
    rangeInput.id = sliderId;
    rangeInput.className = 'celestia-slider';
    rangeInput.dataset.accent = spec.accent;
    rangeInput.min = String(spec.min);
    rangeInput.max = String(spec.max);
    rangeInput.step = String(spec.step);
    rangeInput.value = String(currentValue);
    rangeInput.setAttribute('aria-describedby', descId);
    rangeInput.setAttribute('aria-valuetext', formatted);
    syncSliderCssProps(rangeInput);

    // Min / Max ticks
    const boundsRow = document.createElement('div');
    boundsRow.className =
      'flex justify-between text-[11px] font-mono tabular-nums text-ink-muted -mt-1.5 px-0.5';
    boundsRow.setAttribute('aria-hidden', 'true');
    const minTick =
      spec.format === 'ra-hours'
        ? `${spec.min}h`
        : spec.format === 'day-of-year'
          ? formatSliderValue(spec.min, spec)
          : formatSliderValue(spec.min, spec);
    const maxTick =
      spec.format === 'ra-hours'
        ? `${spec.max}h`
        : spec.format === 'day-of-year'
          ? formatSliderValue(spec.max, spec)
          : formatSliderValue(spec.max, spec);
    boundsRow.innerHTML = `<span>${minTick}</span><span>${maxTick}</span>`;

    let numberInput: HTMLInputElement | undefined;
    let feedbackEl: HTMLParagraphElement | undefined;
    let noticeTimer: number | undefined;

    const clearFeedback = () => {
      if (noticeTimer) {
        window.clearTimeout(noticeTimer);
        noticeTimer = undefined;
      }
      if (feedbackEl) {
        feedbackEl.hidden = true;
        feedbackEl.className = 'hidden';
        feedbackEl.removeAttribute('style');
        feedbackEl.textContent = '';
      }
      if (numberInput) {
        numberInput.setAttribute('aria-invalid', 'false');
        linkMessageId(numberInput, feedbackId, false);
      }
    };

    const showFeedback = (message: string, tone: 'error' | 'info') => {
      if (!feedbackEl || !numberInput) return;
      if (noticeTimer) {
        window.clearTimeout(noticeTimer);
        noticeTimer = undefined;
      }
      feedbackEl.hidden = false;
      feedbackEl.className =
        'flex items-start gap-1.5 rounded-xl border px-3 py-2 text-xs font-medium leading-snug';
      if (tone === 'error') {
        feedbackEl.style.borderColor = 'var(--feedback-error)';
        feedbackEl.style.backgroundColor = 'var(--feedback-error-bg)';
        feedbackEl.style.color = 'var(--feedback-error)';
        feedbackEl.innerHTML = `${ICONS.cross('w-4 h-4 shrink-0 mt-0.5')}<span>${message}</span>`;
      } else {
        feedbackEl.style.borderColor = accentVars.border;
        feedbackEl.style.backgroundColor = accentVars.soft;
        feedbackEl.style.color = accentVars.color;
        feedbackEl.innerHTML = `${ICONS.check('w-4 h-4 shrink-0 mt-0.5')}<span>${message}</span>`;
      }
      numberInput.setAttribute('aria-invalid', tone === 'error' ? 'true' : 'false');
      linkMessageId(numberInput, feedbackId, true);

      liveAnnouncer.textContent = '';
      window.setTimeout(() => {
        liveAnnouncer.textContent = `${labelText}: ${message}`;
      }, 60);

      noticeTimer = window.setTimeout(() => {
        clearFeedback();
      }, 5000);
    };

    const updateAllControlsForSpec = (
      nextVal: number,
      sliderDisplayVal?: number
    ) => {
      values[spec.id] = nextVal;
      const nextFormatted = formatSliderValue(nextVal, spec);
      readout.textContent = nextFormatted;

      const sliderVal = sliderDisplayVal ?? nextVal;
      rangeInput.value = String(sliderVal);
      rangeInput.setAttribute('aria-valuetext', nextFormatted);
      syncSliderCssProps(rangeInput);

      if (numberInput) {
        numberInput.value = formatNumericField(nextVal, spec.step);
      }
    };

    // Slider input handler
    rangeInput.addEventListener('input', () => {
      clearFeedback();
      const rawSliderVal = Number(rangeInput.value);
      const normalized =
        spec.wrapAtMax && rawSliderVal >= spec.max
          ? spec.min
          : roundByStep(rawSliderVal, spec.step);
      updateAllControlsForSpec(normalized, rawSliderVal);
      onChange({ ...values }, spec.id);
    });

    if (spec.wrapAtMax) {
      rangeInput.addEventListener('change', () => {
        if (Number(rangeInput.value) >= spec.max) {
          updateAllControlsForSpec(spec.min, spec.min);
          onChange({ ...values }, spec.id);
        }
      });
    }

    field.append(topRow, desc);

    // Optional number input + +/- stepper buttons alongside slider
    if (spec.numberInput) {
      const controlRow = document.createElement('div');
      controlRow.className = 'flex flex-col gap-2.5 sm:flex-row sm:items-center';

      const sliderWrap = document.createElement('div');
      sliderWrap.className = 'min-w-0 flex-1 space-y-1';
      sliderWrap.append(rangeInput, boundsRow);

      const stepperGroup = document.createElement('div');
      stepperGroup.className =
        'inline-flex items-center gap-1.5 self-start sm:self-auto shrink-0';

      const btnStep = spec.buttonStep ?? 1;

      const decBtn = document.createElement('button');
      decBtn.type = 'button';
      decBtn.className =
        'inline-flex h-11 w-11 items-center justify-center rounded-xl border border-line bg-subtle text-lg font-bold text-ink hover:border-line-strong hover:bg-elevated active:scale-95 transition-all';
      decBtn.setAttribute(
        'aria-label',
        i18n.format(vt.decreaseByOne, { label: labelText, unit: spec.unit })
      );
      decBtn.textContent = '−';

      const inputWrap = document.createElement('div');
      inputWrap.className = 'relative flex items-center';

      numberInput = document.createElement('input');
      numberInput.type = 'text';
      numberInput.id = numId;
      numberInput.name = spec.id;
      numberInput.inputMode = 'decimal';
      numberInput.enterKeyHint = 'done';
      numberInput.autocomplete = 'off';
      numberInput.setAttribute('autocorrect', 'off');
      numberInput.setAttribute('autocapitalize', 'none');
      numberInput.spellcheck = false;
      numberInput.value = formatNumericField(currentValue, spec.step);
      numberInput.setAttribute(
        'aria-label',
        i18n.format(vt.numberInputLabel, { label: labelText })
      );
      numberInput.setAttribute('aria-describedby', descId);
      numberInput.setAttribute('aria-invalid', 'false');
      numberInput.className =
        'celestia-number-input w-24 rounded-xl border border-line-strong bg-surface pl-3 pr-7 py-2 text-right font-semibold text-ink transition-colors';

      const unitSuffix = document.createElement('span');
      unitSuffix.setAttribute('aria-hidden', 'true');
      unitSuffix.className =
        'pointer-events-none absolute right-2.5 text-sm font-mono font-semibold text-ink-muted';
      unitSuffix.textContent = spec.unit;

      inputWrap.append(numberInput, unitSuffix);

      const incBtn = document.createElement('button');
      incBtn.type = 'button';
      incBtn.className =
        'inline-flex h-11 w-11 items-center justify-center rounded-xl border border-line bg-subtle text-lg font-bold text-ink hover:border-line-strong hover:bg-elevated active:scale-95 transition-all';
      incBtn.setAttribute(
        'aria-label',
        i18n.format(vt.increaseByOne, { label: labelText, unit: spec.unit })
      );
      incBtn.textContent = '+';

      feedbackEl = document.createElement('p');
      feedbackEl.id = feedbackId;
      feedbackEl.hidden = true;
      feedbackEl.className = 'hidden';

      const commitNumericInput = () => {
        if (!numberInput) return;
        // Support unicode minus sign (−) typed or pasted
        const rawText = numberInput.value.trim().replace(/−/g, '-');

        // Blank or non-numeric -> restore previous valid value
        if (rawText === '' || !/^[+-]?(\d+\.?\d*|\.\d+)$/.test(rawText)) {
          numberInput.value = formatNumericField(values[spec.id], spec.step);
          showFeedback(vt.invalidRestored, 'error');
          return;
        }

        const parsed = Number(rawText);
        if (!Number.isFinite(parsed)) {
          numberInput.value = formatNumericField(values[spec.id], spec.step);
          showFeedback(vt.invalidRestored, 'error');
          return;
        }

        // Exact circular wrap when Azimuth/λ === 360° or RA/LST === 24h
        if (spec.wrapAtMax && Math.abs(parsed - spec.max) < 0.05) {
          updateAllControlsForSpec(spec.min, spec.min);
          onChange({ ...values }, spec.id);
          const wrapMsg =
            spec.max === 24
              ? vt.wrapped24h
              : spec.id === 'eclipticLon'
                ? i18n.getLocale() === 'th'
                  ? 'ลองจิจูดสุริยะวิถี 360° เท่ากับ 0.0° (จุดวสันตวิษุวัต)'
                  : 'Ecliptic longitude 360° wraps to 0.0° (Vernal Equinox).'
                : vt.wrapped360;
          showFeedback(wrapMsg, 'info');
          return;
        }

        // Out of range -> clamp to boundary and show concise warning
        if (parsed < spec.min || parsed > spec.max) {
          const clampedRaw = parsed < spec.min ? spec.min : spec.max;
          const finalVal =
            spec.wrapAtMax && clampedRaw >= spec.max
              ? spec.min
              : roundByStep(clampedRaw, spec.step);
          updateAllControlsForSpec(finalVal, finalVal);
          onChange({ ...values }, spec.id);

          const baseRangeMsg = spec.rangeErrorMessage
            ? i18n.pick(spec.rangeErrorMessage)
            : `${labelText}: ${spec.min}${spec.unit}–${spec.max}${spec.unit}`;
          const suffix = i18n.format(vt.clampedSuffix, {
            value: formatSliderValue(finalVal, spec),
          });
          showFeedback(`${baseRangeMsg} (${suffix})`, 'error');
          return;
        }

        // Valid value -> round by step and move star immediately
        const rounded = roundByStep(parsed, spec.step);
        const finalVal =
          spec.wrapAtMax && rounded >= spec.max ? spec.min : rounded;
        clearFeedback();
        updateAllControlsForSpec(finalVal, finalVal);
        onChange({ ...values }, spec.id);
      };

      numberInput.addEventListener('input', () => {
        if (numberInput?.getAttribute('aria-invalid') === 'true') {
          clearFeedback();
        }
      });

      numberInput.addEventListener('keydown', (e) => {
        if (e.isComposing) return;
        if (e.key === 'Enter') {
          e.preventDefault();
          commitNumericInput();
          numberInput?.select();
        } else if (e.key === 'Escape') {
          clearFeedback();
          if (numberInput) {
            numberInput.value = formatNumericField(values[spec.id], spec.step);
            numberInput.blur();
          }
        }
      });

      numberInput.addEventListener('blur', () => {
        commitNumericInput();
      });

      const stepBy = (delta: number) => {
        clearFeedback();
        const current = values[spec.id];
        let next = roundByStep(current + delta, spec.step);
        if (spec.wrapAtMax) {
          next = wrapCircular(next, spec.min, spec.max, spec.step);
        } else {
          if (next < spec.min || next > spec.max) {
            const clamped = Math.min(spec.max, Math.max(spec.min, next));
            updateAllControlsForSpec(clamped, clamped);
            onChange({ ...values }, spec.id);
            const baseRangeMsg = spec.rangeErrorMessage
              ? i18n.pick(spec.rangeErrorMessage)
              : `${labelText}: ${spec.min}${spec.unit}–${spec.max}${spec.unit}`;
            showFeedback(baseRangeMsg, 'error');
            return;
          }
        }
        updateAllControlsForSpec(next, next);
        onChange({ ...values }, spec.id);
      };

      decBtn.addEventListener('click', () => stepBy(-btnStep));
      incBtn.addEventListener('click', () => stepBy(btnStep));

      stepperGroup.append(decBtn, inputWrap, incBtn);
      controlRow.append(sliderWrap, stepperGroup);
      field.append(controlRow, feedbackEl);
    } else {
      field.append(rangeInput, boundsRow);
    }

    fieldRefs.set(spec.id, {
      rangeInput,
      readout,
      numberInput,
      feedbackEl,
      feedbackId,
      clearFeedback,
    });

    list.appendChild(field);
  }

  const applyValues = (
    nextValues: Partial<Record<string, number>>,
    silent = false
  ) => {
    let lastChanged = '';
    for (const spec of sliders) {
      const incoming = nextValues[spec.id];
      if (typeof incoming !== 'number' || Number.isNaN(incoming)) continue;
      const normalized = spec.wrapAtMax
        ? wrapCircular(incoming, spec.min, spec.max, spec.step)
        : roundByStep(Math.min(spec.max, Math.max(spec.min, incoming)), spec.step);
      values[spec.id] = normalized;
      lastChanged = spec.id;

      const refs = fieldRefs.get(spec.id);
      if (!refs) continue;
      refs.clearFeedback();

      const formatted = formatSliderValue(normalized, spec);
      refs.rangeInput.value = String(normalized);
      refs.rangeInput.setAttribute('aria-valuetext', formatted);
      syncSliderCssProps(refs.rangeInput);
      refs.readout.textContent = formatted;

      if (refs.numberInput && document.activeElement !== refs.numberInput) {
        refs.numberInput.value = formatNumericField(normalized, spec.step);
      }
    }
    if (!silent && lastChanged) {
      onChange({ ...values }, lastChanged);
    }
  };

  const reset = () => {
    const defaults: Record<string, number> = {};
    for (const spec of sliders) {
      defaults[spec.id] = spec.defaultValue;
    }
    applyValues(defaults, true);
    onChange({ ...values }, 'reset');
    onReset?.({ ...values });
  };

  resetBtn.addEventListener('click', reset);

  return {
    element: root,
    getValues: () => ({ ...values }),
    setValues: applyValues,
    reset,
    destroy: () => {
      resetBtn.removeEventListener('click', reset);
    },
  };
}
