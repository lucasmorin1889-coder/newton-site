(function () {
  'use strict';

  function normalize(val) {
    if (typeof val === 'number') return val;
    return String(val).trim().toLowerCase().replace(/\s+/g, '').replace(',', '.');
  }

  function checkAnswer(userVal, correct) {
    const u = normalize(userVal);
    if (u === '') return false;
    if (Array.isArray(correct)) {
      return correct.some(c => normalize(c) === u);
    }
    if (typeof correct === 'number') {
      const n = parseFloat(u.replace(',', '.'));
      if (Number.isNaN(n)) return false;
      return Math.abs(n - correct) < 1e-6;
    }
    return normalize(correct) === u;
  }

  function el(tag, attrs, children) {
    const e = document.createElement(tag);
    if (attrs) for (const k in attrs) {
      if (k === 'class') e.className = attrs[k];
      else if (k === 'html') e.innerHTML = attrs[k];
      else e.setAttribute(k, attrs[k]);
    }
    (children || []).forEach(c => { if (c) e.appendChild(c); });
    return e;
  }

  function initTest(TEST) {
    const intro = document.getElementById('intro');
    const testScreen = document.getElementById('testScreen');
    const resultScreen = document.getElementById('resultScreen');
    const nameInput = document.getElementById('studentName');
    const phoneInput = document.getElementById('studentPhone');
    const consentInput = document.getElementById('studentConsent');
    const startBtn = document.getElementById('startBtn');
    const printBtn = document.getElementById('printBtn');
    const finishBtn = document.getElementById('finishBtn');
    const answeredCount = document.getElementById('answeredCount');
    const studentNameDisplay = document.getElementById('studentNameDisplay');
    const timerDisplay = document.getElementById('timerDisplay');
    const questionsRoot = document.getElementById('questionsRoot');
    const resultRoot = document.getElementById('resultRoot');

    document.getElementById('testTitle').textContent = TEST.title;
    document.getElementById('testDesc').textContent = TEST.description;
    document.getElementById('metaDuration').textContent = TEST.duration_min;
    document.getElementById('metaQuestions').textContent = TEST.total_questions;
    document.getElementById('metaScore').textContent = TEST.max_score;

    function checkFormValid() {
      startBtn.disabled = !(nameInput.value.trim() && phoneInput.value.trim().length >= 10 && (!consentInput || consentInput.checked));
    }
    nameInput.addEventListener('input', checkFormValid);
    phoneInput.addEventListener('input', checkFormValid);
    if (consentInput) consentInput.addEventListener('change', checkFormValid);

    let timerInterval = null;
    let remainingSeconds = TEST.duration_min * 60;
    const inputs = [];

    function renderQuestions() {
      TEST.sections.forEach(section => {
        const secEl = el('div', { class: 'section' }, [
          el('div', { class: 'section-head' }, [
            el('h2', {}, [document.createTextNode(section.title)]),
            el('span', { class: 'section-meta' }, [document.createTextNode(section.meta)])
          ])
        ]);
        section.questions.forEach(q => {
          const input = el('input', { type: 'text', class: 'ans-input', placeholder: q.unit, 'aria-label': q.unit, 'data-qid': q.id });
          inputs.push({ id: q.id, el: input, correct: q.answer, text: q.text });
          input.addEventListener('input', updateAnsweredCount);
          const qEl = el('div', { class: 'question' }, [
            el('div', { class: 'q-row' }, [
              el('span', { class: 'q-num' }, [document.createTextNode(q.num + '.')]),
              el('span', { class: 'q-text' }, [document.createTextNode(q.text)])
            ]),
            input
          ]);
          secEl.appendChild(qEl);
        });
        questionsRoot.appendChild(secEl);
      });
    }

    function updateAnsweredCount() {
      const answered = inputs.filter(i => i.el.value.trim() !== '').length;
      answeredCount.textContent = 'Отвечено: ' + answered + '/' + inputs.length;
    }

    function formatTime(s) {
      const m = Math.floor(s / 60);
      const sec = s % 60;
      return String(m).padStart(2, '0') + ':' + String(sec).padStart(2, '0');
    }

    function startTimer() {
      timerDisplay.textContent = formatTime(remainingSeconds);
      timerInterval = setInterval(() => {
        remainingSeconds--;
        timerDisplay.textContent = formatTime(remainingSeconds);
        if (remainingSeconds <= 0) {
          clearInterval(timerInterval);
          finishTest();
        }
      }, 1000);
    }

    function finishTest() {
      if (timerInterval) clearInterval(timerInterval);
      let score = 0;
      const breakdown = [];
      inputs.forEach(i => {
        const ok = checkAnswer(i.el.value, i.correct);
        if (ok) score++;
        breakdown.push({ text: i.text, userVal: i.el.value, correct: i.correct, ok });
      });
      const maxScore = inputs.length;
      const pct = Math.round((score / maxScore) * 100);

      resultRoot.innerHTML = '';
      resultRoot.appendChild(el('div', { class: 'score-big' }, [document.createTextNode(score + ' / ' + maxScore)]));
      resultRoot.appendChild(el('div', { class: 'score-pct' }, [document.createTextNode(pct + '%')]));

      const wrong = breakdown.filter(b => !b.ok);
      if (wrong.length) {
        const list = el('div', { class: 'wrong-list' });
        list.appendChild(el('div', { class: 'wrong-title' }, [document.createTextNode('Стоит повторить:')]));
        wrong.forEach(w => {
          list.appendChild(el('div', { class: 'wrong-item' }, [document.createTextNode(w.text)]));
        });
        resultRoot.appendChild(list);
      }

      testScreen.hidden = true;
      resultScreen.hidden = false;

      try {
        window.__NEWTON_SUBMIT__ && window.__NEWTON_SUBMIT__({
          name: nameInput.value.trim(),
          phone: phoneInput.value.trim(),
          subject: TEST.subject,
          grade: TEST.grade,
          test_id: TEST.id,
          score: score,
          maxScore: maxScore,
          percent: pct,
          breakdown: breakdown
        });
      } catch (e) { /* CRM wiring not connected yet */ }
    }

    startBtn.addEventListener('click', () => {
      intro.hidden = true;
      testScreen.hidden = false;
      studentNameDisplay.textContent = nameInput.value.trim();
      startTimer();
    });

    const printRoot = document.getElementById('printRoot');
    function renderPrintSheet() {
      printRoot.innerHTML = '';
      printRoot.appendChild(el('div', { class: 'print-head' }, [
        el('div', { class: 'print-brand-row' }, [
          el('span', { class: 'print-brand' }, [document.createTextNode('Образовательный центр «Ньютон»')]),
          el('span', { class: 'print-meta' }, [document.createTextNode(TEST.duration_min + ' мин · ' + TEST.total_questions + ' заданий · ' + TEST.max_score + ' баллов max')])
        ]),
        el('h1', {}, [document.createTextNode(TEST.title + ' — ' + TEST.grade)]),
        el('div', { class: 'print-fields' }, [
          el('span', { class: 'print-field-name' }, [document.createTextNode('ФИО ученика: _______________________________________')]),
          el('span', {}, [document.createTextNode('Дата: ___________')]),
          el('span', {}, [document.createTextNode('Оценка: _____ из ' + TEST.max_score)])
        ])
      ]));
      TEST.sections.forEach(section => {
        const secEl = el('div', { class: 'print-section' }, [
          el('div', { class: 'print-section-head' }, [document.createTextNode(section.title + ' — ' + section.meta)])
        ]);
        section.questions.forEach(q => {
          secEl.appendChild(el('div', { class: 'print-question' }, [
            el('div', { class: 'print-q-row' }, [
              el('span', { class: 'q-num' }, [document.createTextNode(q.num + '.')]),
              el('span', {}, [document.createTextNode(q.text)])
            ]),
            el('div', { class: 'print-answer-line' }, [
              el('span', { class: 'print-unit' }, [document.createTextNode(q.unit)])
            ])
          ]));
        });
        printRoot.appendChild(secEl);
      });
    }

    function doPrint() {
      renderPrintSheet();
      document.body.classList.add('print-mode');
      window.print();
      setTimeout(() => document.body.classList.remove('print-mode'), 500);
    }

    printBtn.addEventListener('click', doPrint);

    finishBtn.addEventListener('click', finishTest);

    renderQuestions();
    updateAnsweredCount();
    checkFormValid();

    if (new URLSearchParams(location.search).get('print') === '1') {
      setTimeout(doPrint, 300);
    }
  }

  window.NewtonTestEngine = { init: initTest };
})();
