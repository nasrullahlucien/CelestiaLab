import type { CoordAccent, QuizQuestion } from '../data/modules';
import { i18n } from '../i18n';
import { ICONS } from './Icons';

export interface QuizCardOptions {
  questions: QuizQuestion[];
  accent: CoordAccent | 'multi';
}

export interface QuizCardHandle {
  element: HTMLElement;
}

const ACCENT_RING: Record<CoordAccent | 'multi', string> = {
  horizon: 'bg-horizon',
  equatorial: 'bg-equatorial',
  ecliptic: 'bg-ecliptic',
  multi: 'bg-equatorial',
};

const CHOICE_LETTERS = ['ก', 'ข', 'ค', 'ง'];
const CHOICE_LETTERS_EN = ['A', 'B', 'C', 'D'];

export function createQuizCard(options: QuizCardOptions): QuizCardHandle {
  const { questions, accent } = options;
  const answers = new Map<number, number>();
  let currentIndex = 0;
  let showSummary = false;

  const section = document.createElement('section');
  section.className =
    'rounded-2xl border border-line bg-surface p-5 sm:p-6 shadow-sm';

  const render = () => {
    const t = i18n.t().quiz;
    const isThai = i18n.getLocale() === 'th';
    const letters = isThai ? CHOICE_LETTERS : CHOICE_LETTERS_EN;
    const total = questions.length;
    const answeredCount = answers.size;

    section.innerHTML = '';

    // Header
    const header = document.createElement('div');
    header.className =
      'mb-5 flex flex-wrap items-start justify-between gap-3 border-b border-line pb-4';

    const titleWrap = document.createElement('div');
    const h2 = document.createElement('h2');
    h2.className = 'text-lg font-bold text-ink';
    h2.textContent = t.heading;

    const sub = document.createElement('p');
    sub.className = 'mt-1 text-sm text-ink-secondary';
    sub.textContent = t.subheading;
    titleWrap.append(h2, sub);

    const progressBadge = document.createElement('span');
    progressBadge.className =
      'inline-flex items-center rounded-full border border-line bg-subtle px-3 py-1 text-xs font-semibold tabular-nums text-ink-secondary';
    progressBadge.textContent = i18n.format(t.answeredCount, {
      done: answeredCount,
      total,
    });

    header.append(titleWrap, progressBadge);
    section.appendChild(header);

    // Progress bar
    const progressWrap = document.createElement('div');
    progressWrap.className = 'mb-5 h-2 w-full overflow-hidden rounded-full bg-subtle';
    progressWrap.setAttribute('aria-hidden', 'true');
    const fill = document.createElement('div');
    fill.className = `h-full rounded-full transition-all duration-300 ${ACCENT_RING[accent]}`;
    const pct = showSummary ? 100 : Math.round(((currentIndex + 1) / total) * 100);
    fill.style.width = `${pct}%`;
    progressWrap.appendChild(fill);
    section.appendChild(progressWrap);

    if (showSummary) {
      let score = 0;
      questions.forEach((q, idx) => {
        if (answers.get(idx) === q.correctIndex) score++;
      });

      const summaryBox = document.createElement('div');
      summaryBox.className =
        'rounded-2xl border border-line bg-subtle p-6 text-center space-y-4';

      const scoreHeading = document.createElement('h3');
      scoreHeading.className = 'text-xl font-bold text-ink';
      scoreHeading.textContent = t.scoreHeading;

      const scoreNumber = document.createElement('p');
      scoreNumber.className =
        'text-3xl font-bold font-mono tabular-nums text-ink';
      scoreNumber.textContent = `${score} / ${total}`;

      const scoreText = document.createElement('p');
      scoreText.className = 'text-sm text-ink-secondary';
      scoreText.textContent = i18n.format(t.scoreSummary, { score, total });

      const retryBtn = document.createElement('button');
      retryBtn.type = 'button';
      retryBtn.className =
        'inline-flex items-center gap-2 rounded-xl border border-line-strong bg-surface px-5 py-2.5 text-sm font-semibold text-ink hover:bg-elevated transition-colors';
      retryBtn.innerHTML = `${ICONS.reset('w-4 h-4')}<span>${t.retry}</span>`;
      retryBtn.addEventListener('click', () => {
        answers.clear();
        currentIndex = 0;
        showSummary = false;
        render();
      });

      summaryBox.append(scoreHeading, scoreNumber, scoreText, retryBtn);
      section.appendChild(summaryBox);
      return;
    }

    const q = questions[currentIndex];
    const selected = answers.get(currentIndex);
    const hasAnswered = selected !== undefined;

    // Question stepper dots
    const navRow = document.createElement('div');
    navRow.className = 'mb-3 flex flex-wrap items-center justify-between gap-2';

    const counter = document.createElement('p');
    counter.className = 'text-xs font-semibold uppercase tracking-wide text-ink-muted';
    counter.textContent = i18n.format(t.questionOf, {
      current: currentIndex + 1,
      total,
    });

    const stepList = document.createElement('div');
    stepList.className = 'flex items-center gap-1.5';
    questions.forEach((item, idx) => {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.className =
        'inline-flex items-center justify-center rounded-lg border px-2.5 py-1 text-xs font-mono font-semibold tabular-nums transition-colors';
      dot.setAttribute(
        'aria-label',
        i18n.format(t.questionOf, { current: idx + 1, total })
      );
      if (idx === currentIndex) {
        dot.setAttribute('aria-current', 'step');
      }

      const ans = answers.get(idx);
      if (idx === currentIndex) {
        dot.classList.add('border-line-strong', 'bg-elevated', 'text-ink');
      } else if (ans === item.correctIndex) {
        dot.style.borderColor = 'var(--feedback-success)';
        dot.style.backgroundColor = 'var(--feedback-success-bg)';
        dot.style.color = 'var(--feedback-success)';
      } else if (ans !== undefined) {
        dot.style.borderColor = 'var(--feedback-error)';
        dot.style.backgroundColor = 'var(--feedback-error-bg)';
        dot.style.color = 'var(--feedback-error)';
      } else {
        dot.classList.add('border-line', 'bg-subtle', 'text-ink-muted');
      }
      dot.textContent = String(idx + 1);
      dot.addEventListener('click', () => {
        currentIndex = idx;
        render();
      });
      stepList.appendChild(dot);
    });

    navRow.append(counter, stepList);
    section.appendChild(navRow);

    // Question prompt
    const promptEl = document.createElement('h3');
    promptEl.className = 'mb-4 text-base sm:text-lg font-semibold text-ink leading-snug';
    promptEl.textContent = i18n.pick(q.prompt);
    section.appendChild(promptEl);

    // Choices
    const choicesWrap = document.createElement('div');
    choicesWrap.className = 'grid grid-cols-1 gap-2.5';

    q.choices.forEach((choice, idx) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.disabled = hasAnswered;
      btn.className =
        'flex w-full items-start gap-3 rounded-xl border px-4 py-3 text-left text-sm sm:text-base transition-colors';

      const isSelected = selected === idx;
      const isCorrectChoice = idx === q.correctIndex;

      let stateIcon = '';
      if (!hasAnswered) {
        btn.classList.add(
          'border-line',
          'bg-subtle',
          'text-ink',
          'hover:border-line-strong',
          'hover:bg-elevated'
        );
      } else if (isCorrectChoice) {
        btn.style.borderColor = 'var(--feedback-success)';
        btn.style.backgroundColor = 'var(--feedback-success-bg)';
        btn.style.color = 'var(--text-primary)';
        stateIcon = `<span class="ml-auto shrink-0" style="color: var(--feedback-success)">${ICONS.check('w-5 h-5')}</span>`;
      } else if (isSelected) {
        btn.style.borderColor = 'var(--feedback-error)';
        btn.style.backgroundColor = 'var(--feedback-error-bg)';
        btn.style.color = 'var(--text-primary)';
        stateIcon = `<span class="ml-auto shrink-0" style="color: var(--feedback-error)">${ICONS.cross('w-5 h-5')}</span>`;
      } else {
        btn.classList.add('border-line', 'bg-subtle', 'text-ink-muted', 'opacity-75');
      }

      const badge = document.createElement('span');
      badge.className =
        'inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-line bg-surface text-xs font-bold text-ink';
      badge.textContent = letters[idx] ?? String(idx + 1);

      const textSpan = document.createElement('span');
      textSpan.className = 'pt-0.5 leading-relaxed';
      textSpan.textContent = i18n.pick(choice);

      btn.append(badge, textSpan);
      if (stateIcon) {
        btn.insertAdjacentHTML('beforeend', stateIcon);
      }

      btn.addEventListener('click', () => {
        if (answers.has(currentIndex)) return;
        answers.set(currentIndex, idx);
        render();
      });

      choicesWrap.appendChild(btn);
    });

    section.appendChild(choicesWrap);

    // Live instant feedback box
    const feedbackRegion = document.createElement('div');
    feedbackRegion.setAttribute('aria-live', 'polite');
    feedbackRegion.className = 'mt-4';

    if (hasAnswered) {
      const isCorrect = selected === q.correctIndex;
      const box = document.createElement('div');
      box.className = 'rounded-xl border p-4 space-y-2';
      box.style.borderColor = isCorrect
        ? 'var(--feedback-success)'
        : 'var(--feedback-error)';
      box.style.backgroundColor = isCorrect
        ? 'var(--feedback-success-bg)'
        : 'var(--feedback-error-bg)';

      const statusRow = document.createElement('div');
      statusRow.className = 'flex items-center gap-2 font-bold text-sm';
      statusRow.style.color = isCorrect
        ? 'var(--feedback-success)'
        : 'var(--feedback-error)';
      statusRow.innerHTML = `${
        isCorrect ? ICONS.check('w-5 h-5 shrink-0') : ICONS.cross('w-5 h-5 shrink-0')
      }<span>${isCorrect ? t.correct : t.incorrect}</span>`;

      const exp = document.createElement('p');
      exp.className = 'text-sm text-ink leading-relaxed';
      exp.innerHTML = `<strong class="font-semibold">${t.explanationLabel}</strong> ${i18n.pick(
        q.explanation
      )}`;

      const actionRow = document.createElement('div');
      actionRow.className = 'pt-2 flex justify-end';

      const nextBtn = document.createElement('button');
      nextBtn.type = 'button';
      nextBtn.className =
        'inline-flex items-center gap-2 rounded-xl border border-line-strong bg-surface px-4 py-2 text-sm font-semibold text-ink hover:bg-elevated transition-colors';
      const isLast = currentIndex === total - 1;
      nextBtn.innerHTML = `<span>${isLast ? t.finishQuiz : t.nextQuestion}</span>${ICONS.arrowRight('w-4 h-4')}`;
      nextBtn.addEventListener('click', () => {
        if (isLast) {
          showSummary = true;
        } else {
          currentIndex++;
        }
        render();
      });

      actionRow.appendChild(nextBtn);
      box.append(statusRow, exp, actionRow);
      feedbackRegion.appendChild(box);
    }

    section.appendChild(feedbackRegion);
  };

  render();

  return {
    element: section,
  };
}
