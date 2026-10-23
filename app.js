/**
 * PyMaster 30 — Interactive Learning Engine & Studio Logic
 * Handles Pyodide WASM runtime, test verifier, UI state, progress tracking,
 * interactive REPL, markdown rendering, and local sync.
 */

(function () {
  'use strict';

  // -------------------------------------------------------------------------
  // 1. Global Application State
  // -------------------------------------------------------------------------
  const state = {
    activeDay: 1,
    activeMode: 'learn', // 'learn' | 'practice' | 'playground' | 'quiz' | 'cheatsheet'
    activeChallengeIndex: 0,
    activePgMode: 'script', // 'script' | 'repl'
    activeCategory: 'all',
    activePhase: 'all',
    searchQuery: '',
    runner: 'pyodide', // 'pyodide' | 'local'
    pyodideInstance: null,
    pyodideLoading: false,
    replHistory: [],
    replHistoryIndex: -1,
    userProgress: {
      completedDays: [],
      solvedChallenges: [],
      quizScores: {},
      savedCode: {},
      streak: 1,
      lastActiveDate: new Date().toISOString().split('T')[0]
    }
  };

  // Preset code templates for the Playground
  const CODE_TEMPLATES = {
    scratchpad: `# PyMaster 30 Playground Scratchpad\n# Type any Python code below and press Ctrl+Enter to run!\n\ndef greet(name):\n    return f"Hello, {name}! Welcome to 30 Days of Python 🚀"\n\nprint(greet("Pythonista"))\n`,
    comprehension: `# List & Dictionary Comprehensions in Action\nnumbers = range(1, 11)\n\n# Squares of even numbers\neven_squares = [x**2 for x in numbers if x % 2 == 0]\nprint("Even Squares:", even_squares)\n\n# Word length dictionary comprehension\nwords = ["python", "learning", "studio", "mastery"]\nword_map = {w.upper(): len(w) for w in words}\nprint("Word Map:", word_map)\n`,
    stats_class: `# Object-Oriented Statistics Class\nclass StatsTracker:\n    def __init__(self, data):\n        self.data = sorted(data)\n\n    def mean(self):\n        return sum(self.data) / len(self.data)\n\n    def median(self):\n        n = len(self.data)\n        mid = n // 2\n        return self.data[mid] if n % 2 != 0 else (self.data[mid-1] + self.data[mid]) / 2\n\nscores = [88, 92, 79, 95, 85, 100]\ntracker = StatsTracker(scores)\nprint("Scores:", tracker.data)\nprint("Mean:", round(tracker.mean(), 2))\nprint("Median:", tracker.median())\n`,
    regex_cleaner: `# Regular Expressions & Text Cleaning\nimport re\n\nlog_entry = "2026-10-23 10:45:12 [INFO] User id=4029 logged in from ip=192.168.1.15"\n\nip_match = re.search(r'ip=(\\d+\\.\\d+\\.\\d+\\.\\d+)', log_entry)\nuser_match = re.search(r'id=(\\d+)', log_entry)\n\nif ip_match and user_match:\n    print(f"Extracted User ID: {user_match.group(1)}")\n    print(f"Extracted IP Address: {ip_match.group(1)}")\n`,
    math_algorithms: `# Prime Numbers Sieve (Eratosthenes)\ndef sieve(limit):\n    primes = []\n    is_prime = [True] * (limit + 1)\n    for p in range(2, limit + 1):\n        if is_prime[p]:\n            primes.append(p)\n            for i in range(p * p, limit + 1, p):\n                is_prime[i] = False\n    return primes\n\nprint("Primes up to 50:", sieve(50))\n`,
    data_filter: `# Data Processing Simulation\nrecords = [\n    {"name": "Alice", "role": "Data Engineer", "skills": ["Python", "SQL", "Spark"]},\n    {"name": "Bob", "role": "Frontend Dev", "skills": ["JavaScript", "CSS", "React"]},\n    {"name": "Charlie", "role": "ML Engineer", "skills": ["Python", "PyTorch", "NumPy"]},\n]\n\npython_devs = [r["name"] for r in records if "Python" in r["skills"]]\nprint("Python Developers in team:", python_devs)\n`
  };

  // -------------------------------------------------------------------------
  // 2. Initialization & Bootstrap
  // -------------------------------------------------------------------------
  document.addEventListener('DOMContentLoaded', () => {
    loadUserProgress();
    checkDailyStreak();
    initPyodideAsync();
    bindEvents();
    renderSidebar();
    renderDayView();
    renderCheatSheet();
    updateGlobalProgressUI();
  });

  // -------------------------------------------------------------------------
  // 3. Pyodide WASM Runtime Loader
  // -------------------------------------------------------------------------
  async function initPyodideAsync() {
    const statusDot = document.getElementById('runner-status-dot');
    const engineBadge = document.getElementById('active-engine-badge');
    const runnerSelect = document.getElementById('runner-select');

    // Detect if running on GitHub Pages or static host
    const isStaticHost = window.location.hostname.endsWith('github.io') || window.location.protocol === 'file:';
    if (isStaticHost && runnerSelect) {
      state.runner = 'pyodide';
      runnerSelect.innerHTML = `
        <option value="pyodide" selected>⚡ In-Browser WASM (Python 3.11)</option>
        <option value="local" disabled>🐍 Local Runner (Desktop only)</option>
      `;
    }

    if (window.loadPyodide && !state.pyodideInstance && !state.pyodideLoading) {
      try {
        state.pyodideLoading = true;
        statusDot.className = 'runner-status-dot'; // waiting
        console.log('Initializing Pyodide WebAssembly Python...');
        
        state.pyodideInstance = await window.loadPyodide();
        console.log('Pyodide WebAssembly Python loaded successfully!');
        
        statusDot.className = 'runner-status-dot online';
        if (engineBadge) engineBadge.textContent = 'Pyodide WASM';
      } catch (err) {
        console.warn('Pyodide CDN load failed or blocked; falling back to local runner.', err);
        if (!isStaticHost) {
          state.runner = 'local';
          if (runnerSelect) runnerSelect.value = 'local';
          statusDot.className = 'runner-status-dot online';
          if (engineBadge) engineBadge.textContent = 'Local Python 3.11';
        }
      } finally {
        state.pyodideLoading = false;
      }
    }
  }

  // -------------------------------------------------------------------------
  // 4. Python Execution Engine (Pyodide + Local Fallback)
  // -------------------------------------------------------------------------
  async function executePythonCode(code, captureGlobals = false) {
    const t0 = performance.now();
    const runnerSelect = document.getElementById('runner-select');
    const selectedRunner = runnerSelect ? runnerSelect.value : state.runner;

    // Run via Local Server Endpoint if selected or if Pyodide is not loaded
    if (selectedRunner === 'local' || !state.pyodideInstance) {
      try {
        const resp = await fetch('/api/run', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code })
        });
        if (resp.ok) {
          const result = await resp.json();
          return {
            success: result.success,
            stdout: result.stdout || '',
            stderr: result.stderr || '',
            durationMs: result.duration_ms || Math.round(performance.now() - t0),
            globals: {}
          };
        }
      } catch (e) {
        // If local server is not running and Pyodide is still loading
        if (!state.pyodideInstance) {
          return {
            success: false,
            stdout: '',
            stderr: 'Python runner is initializing. Please wait 2-3 seconds and try again!',
            durationMs: 0
          };
        }
      }
    }

    // Run via In-Browser Pyodide WebAssembly
    if (state.pyodideInstance) {
      let stdoutBuffer = [];
      let stderrBuffer = [];

      try {
        state.pyodideInstance.setStdout({ batched: (msg) => stdoutBuffer.push(msg) });
        state.pyodideInstance.setStderr({ batched: (msg) => stderrBuffer.push(msg) });

        // Execute in clean namespace
        await state.pyodideInstance.runPythonAsync(code);
        const durationMs = Math.round(performance.now() - t0);

        let globalsObj = {};
        if (captureGlobals) {
          try {
            const keysPy = state.pyodideInstance.runPython("list(globals().keys())");
            const keys = keysPy.toJs();
            for (const k of keys) {
              if (!k.startsWith('__')) {
                try {
                  const val = state.pyodideInstance.globals.get(k);
                  globalsObj[k] = val && val.toJs ? val.toJs() : val;
                } catch (ignore) {}
              }
            }
          } catch (e) {}
        }

        return {
          success: stderrBuffer.length === 0,
          stdout: stdoutBuffer.join('\n'),
          stderr: stderrBuffer.join('\n'),
          durationMs,
          globals: globalsObj
        };
      } catch (err) {
        const durationMs = Math.round(performance.now() - t0);
        return {
          success: false,
          stdout: stdoutBuffer.join('\n'),
          stderr: err.message || String(err),
          durationMs,
          globals: {}
        };
      }
    }

    return {
      success: false,
      stdout: '',
      stderr: 'No execution engine available. Check server or internet connection.',
      durationMs: 0
    };
  }

  // -------------------------------------------------------------------------
  // 5. Automated Challenge Test Runner
  // -------------------------------------------------------------------------
  async function runChallengeTests(userCode, testCodeSnippet) {
    const combinedScript = `
import sys, io

__user_stdout_capture = io.StringIO()
__orig_stdout = sys.stdout
sys.stdout = __user_stdout_capture

# User script execution
try:
${userCode.split('\n').map(l => '    ' + l).join('\n')}
finally:
    sys.stdout = __orig_stdout

__captured_stdout = __user_stdout_capture.getvalue()
print(__captured_stdout, end='')

# Test harness
${testCodeSnippet}

# Execute test function
__test_pass, __test_msg = __test(__captured_stdout, locals())
print(f"__PYMASTER_TEST_PASS__:{__test_pass}:{__test_msg}")
`;

    const result = await executePythonCode(combinedScript);
    let passed = false;
    let message = '';

    if (result.stdout.includes('__PYMASTER_TEST_PASS__:True')) {
      passed = true;
      const parts = result.stdout.split('__PYMASTER_TEST_PASS__:True:');
      message = parts[1] ? parts[1].trim() : 'All tests passed successfully!';
      // Clean up internal token from stdout
      result.stdout = parts[0].trim();
    } else if (result.stderr) {
      passed = false;
      // Extract assertion error message cleanly
      const lines = result.stderr.split('\n');
      const assertLine = lines.find(l => l.includes('AssertionError:'));
      message = assertLine ? assertLine.replace('AssertionError:', '').trim() : result.stderr;
    } else {
      passed = false;
      message = 'Test conditions not satisfied. Please review challenge requirements.';
    }

    return { passed, message, stdout: result.stdout, stderr: result.stderr, durationMs: result.durationMs };
  }

  // -------------------------------------------------------------------------
  // 6. UI Renderers: Sidebar & Curriculum
  // -------------------------------------------------------------------------
  function renderSidebar() {
    const listContainer = document.getElementById('curriculum-days-list');
    if (!listContainer || !window.CURRICULUM_DATA) return;

    listContainer.innerHTML = '';
    const query = state.searchQuery.toLowerCase().trim();

    const filtered = window.CURRICULUM_DATA.filter(day => {
      const matchPhase = state.activePhase === 'all' || day.phase === state.activePhase;
      const matchSearch = !query ||
        day.title.toLowerCase().includes(query) ||
        day.summary.toLowerCase().includes(query) ||
        day.topics.some(t => t.toLowerCase().includes(query)) ||
        `day ${day.day}`.includes(query);
      return matchPhase && matchSearch;
    });

    if (filtered.length === 0) {
      listContainer.innerHTML = `<div style="padding:20px; text-align:center; color:var(--text-muted); font-size:13px;">No matching topics found for "${query}"</div>`;
      return;
    }

    filtered.forEach(day => {
      const item = document.createElement('div');
      item.className = `day-list-item ${day.day === state.activeDay ? 'active' : ''}`;
      item.id = `sidebar-day-${day.day}`;
      const isCompleted = state.userProgress.completedDays.includes(day.day);

      item.innerHTML = `
        <div class="day-item-left">
          <span class="day-number-pill">${day.day < 10 ? '0' + day.day : day.day}</span>
          <div class="day-item-info">
            <span class="day-item-title">${day.icon} ${day.title}</span>
            <span class="day-item-phase">${day.phase}</span>
          </div>
        </div>
        <div class="day-item-right">
          <span class="day-check-icon ${isCompleted ? 'completed' : ''}" title="${isCompleted ? 'Completed' : 'Not completed'}">
            ${isCompleted ? '✓' : '○'}
          </span>
        </div>
      `;

      item.addEventListener('click', () => {
        state.activeDay = day.day;
        state.activeChallengeIndex = 0;
        renderSidebar();
        renderDayView();
      });

      listContainer.appendChild(item);
    });

    // Update sidebar completed stats
    const completedCount = state.userProgress.completedDays.length;
    const totalDays = window.CURRICULUM_DATA.length;
    const pct = Math.round((completedCount / totalDays) * 100);
    document.getElementById('sidebar-completed-count').textContent = `${completedCount} / ${totalDays} Completed`;
    document.getElementById('sidebar-percent').textContent = `${pct}%`;
  }

  // -------------------------------------------------------------------------
  // 7. Render Day View (Learn, Practice, Quiz)
  // -------------------------------------------------------------------------
  function renderDayView() {
    const day = window.CURRICULUM_DATA ? window.CURRICULUM_DATA.find(d => d.day === state.activeDay) : null;
    if (!day) return;

    // 1. Update Learn Banner
    document.getElementById('lesson-day-badge').textContent = `Day ${day.day}`;
    document.getElementById('lesson-phase-badge').textContent = day.phase;
    document.getElementById('lesson-title').textContent = `${day.icon} ${day.title}`;
    document.getElementById('lesson-summary').textContent = day.summary;
    document.getElementById('footer-day-indicator').textContent = `Day ${day.day} of ${window.CURRICULUM_DATA.length}`;

    // Update Topics Tags
    const topicsContainer = document.getElementById('lesson-topics-tags');
    topicsContainer.innerHTML = '';
    (day.topics || []).forEach(topic => {
      const tag = document.createElement('span');
      tag.className = 'topic-tag';
      tag.textContent = topic;
      topicsContainer.appendChild(tag);
    });

    // Update Read Checkmark
    const isCompleted = state.userProgress.completedDays.includes(day.day);
    document.getElementById('mark-read-check').textContent = isCompleted ? '✅' : '⭕';
    document.getElementById('mark-read-text').textContent = isCompleted ? 'Day Completed' : 'Mark Day Complete';

    // 2. Render Markdown Lesson
    renderMarkdownContent(day.markdown);

    // 3. Update Guided Practice
    renderPracticeView(day);

    // 4. Update Daily Quiz
    renderQuizView(day);

    // Update challenge badge in header
    const challengeCount = (day.challenges || []).length;
    const challengeBadge = document.getElementById('active-day-challenge-badge');
    if (challengeBadge) challengeBadge.textContent = challengeCount;
  }

  function highlightPythonCode(code) {
    let esc = escapeHtml(code);
    // Comments
    esc = esc.replace(/(#[^\n]*)/g, '<span class="token-comment">$1</span>');
    // Strings (prevent replacing inside already created span tags)
    esc = esc.replace(/("""[\s\S]*?"""|'''[\s\S]*?'''|f"[^"\n]*"|f'[^'\n]*'|"[^"\n]*"|'[^'\n]*')/g, '<span class="token-string">$1</span>');
    // Keywords
    const kwRegex = /\b(def|class|return|if|elif|else|for|while|try|except|finally|import|from|as|in|is|not|and|or|lambda|pass|break|continue|with|raise|yield|async|await|assert|global|nonlocal)\b/g;
    esc = esc.replace(kwRegex, (m, kw) => `<span class="token-keyword">${kw}</span>`);
    // Builtins
    const bRegex = /\b(print|len|type|range|enumerate|zip|sum|min|max|sorted|int|float|str|list|dict|set|tuple|bool|round|abs|map|filter|input|open|isinstance)\b/g;
    esc = esc.replace(bRegex, (m, fn) => `<span class="token-builtin">${fn}</span>`);
    // Numbers
    esc = esc.replace(/\b(\d+(\.\d+)?)\b/g, '<span class="token-number">$1</span>');
    return esc;
  }

  function renderMarkdownContent(rawMarkdown) {
    const container = document.getElementById('lesson-markdown-body');
    if (!container) return;

    if (window.marked) {
      container.innerHTML = window.marked.parse(rawMarkdown || '# No content available');
    } else {
      // Basic fallback
      container.innerHTML = `<pre style="white-space: pre-wrap; font-family: inherit;">${rawMarkdown}</pre>`;
    }

    // Enhance all <pre><code> code blocks with Syntax Highlighting, Run & Copy buttons
    const codeBlocks = container.querySelectorAll('pre');
    codeBlocks.forEach(pre => {
      const codeElem = pre.querySelector('code');
      if (!codeElem) return;
      const codeText = codeElem.innerText;

      // Apply syntax highlighting
      codeElem.innerHTML = highlightPythonCode(codeText);

      const wrapper = document.createElement('div');
      wrapper.className = 'code-block-wrapper';

      const header = document.createElement('div');
      header.className = 'code-block-header';
      header.innerHTML = `
        <span>Python Code</span>
        <div class="code-block-actions">
          <button class="btn-snippet-action btn-copy-snippet" title="Copy code">Copy</button>
          <button class="btn-snippet-action btn-run-snippet" title="Open and execute in Playground">⚡ Try in Playground</button>
        </div>
      `;

      // Copy action
      header.querySelector('.btn-copy-snippet').addEventListener('click', (e) => {
        navigator.clipboard.writeText(codeText);
        e.target.textContent = 'Copied!';
        setTimeout(() => { e.target.textContent = 'Copy'; }, 1500);
      });

      // Try in Playground action
      header.querySelector('.btn-run-snippet').addEventListener('click', () => {
        switchMode('playground');
        const pgEditor = document.getElementById('pg-code-editor');
        if (pgEditor) {
          pgEditor.value = codeText;
          updateEditorLineNumbers(pgEditor, document.getElementById('pg-line-numbers'));
          document.getElementById('btn-pg-run').click();
        }
      });

      pre.parentNode.insertBefore(wrapper, pre);
      wrapper.appendChild(header);
      wrapper.appendChild(pre);
    });
  }

  // -------------------------------------------------------------------------
  // 8. Practice Mode Controller
  // -------------------------------------------------------------------------
  function renderPracticeView(day) {
    document.getElementById('practice-day-icon').textContent = day.icon;
    document.getElementById('practice-day-heading').textContent = `Day ${day.day}: ${day.title}`;

    const tabsContainer = document.getElementById('challenge-level-tabs');
    tabsContainer.innerHTML = '';

    const challenges = day.challenges || [];
    if (challenges.length === 0) {
      document.getElementById('challenge-title').textContent = 'No challenges for this day';
      document.getElementById('challenge-description').textContent = 'Review the lesson and experiment in the Playground!';
      return;
    }

    if (state.activeChallengeIndex >= challenges.length) {
      state.activeChallengeIndex = 0;
    }

    challenges.forEach((ch, idx) => {
      const btn = document.createElement('button');
      btn.className = `level-tab-btn ${idx === state.activeChallengeIndex ? 'active' : ''}`;
      const isSolved = state.userProgress.solvedChallenges.includes(ch.id);
      btn.innerHTML = `${ch.level} ${isSolved ? '✓' : ''}`;

      btn.addEventListener('click', () => {
        state.activeChallengeIndex = idx;
        renderPracticeView(day);
      });

      tabsContainer.appendChild(btn);
    });

    const currentCh = challenges[state.activeChallengeIndex];
    document.getElementById('challenge-level-tag').textContent = currentCh.level;
    document.getElementById('challenge-title').textContent = currentCh.title;
    document.getElementById('challenge-description').textContent = currentCh.description;

    const isSolved = state.userProgress.solvedChallenges.includes(currentCh.id);
    const statusBadge = document.getElementById('challenge-status-badge');
    statusBadge.className = `challenge-status-badge ${isSolved ? 'solved' : ''}`;
    statusBadge.textContent = isSolved ? '✓ Solved' : 'Unsolved';

    // Populate drawers
    document.getElementById('hint-body').textContent = currentCh.hint || 'No hint available.';
    document.getElementById('solution-code').textContent = currentCh.solution || '# Solution not available';
    document.getElementById('hint-drawer').style.display = 'none';
    document.getElementById('solution-drawer').style.display = 'none';

    // Load code into editor (saved code or starter code)
    const editor = document.getElementById('code-editor');
    const saved = state.userProgress.savedCode[currentCh.id];
    editor.value = (saved !== undefined) ? saved : currentCh.starterCode;
    updateEditorLineNumbers(editor, document.getElementById('editor-line-numbers'));

    // Reset test results panel
    const testResultsBody = document.getElementById('test-results-body');
    const testStatusPill = document.getElementById('test-summary-pill');
    testStatusPill.className = 'test-status-pill';
    testStatusPill.textContent = 'Waiting for run';
    testResultsBody.innerHTML = '<p class="test-placeholder">Click <strong>"Verify & Run Tests"</strong> to test your solution against automated test assertions.</p>';
  }

  // -------------------------------------------------------------------------
  // 9. Daily Quiz View Controller
  // -------------------------------------------------------------------------
  function renderQuizView(day) {
    document.getElementById('quiz-day-title').textContent = `${day.icon} Day ${day.day} Knowledge Check`;
    const container = document.getElementById('quiz-questions-list');
    container.innerHTML = '';

    const questions = day.quiz || [];
    if (questions.length === 0) {
      container.innerHTML = '<p style="color:var(--text-muted); text-align:center;">No quiz questions for this day.</p>';
      return;
    }

    const currentScore = state.userProgress.quizScores[day.day] || 0;
    document.getElementById('quiz-score-val').textContent = currentScore;
    document.getElementById('quiz-score-badge').querySelector('.score-label').textContent = `/ ${questions.length} Correct`;

    questions.forEach((q, qIdx) => {
      const card = document.createElement('div');
      card.className = 'quiz-question-card';

      const prompt = document.createElement('div');
      prompt.className = 'question-prompt';
      prompt.textContent = `${qIdx + 1}. ${q.question}`;
      card.appendChild(prompt);

      const optionsGrid = document.createElement('div');
      optionsGrid.className = 'quiz-options-grid';

      const prefixes = ['A', 'B', 'C', 'D'];
      q.options.forEach((optText, optIdx) => {
        const optBtn = document.createElement('button');
        optBtn.className = 'quiz-option-btn';
        optBtn.innerHTML = `
          <span class="option-prefix">${prefixes[optIdx]}</span>
          <span class="option-text">${optText}</span>
        `;

        optBtn.addEventListener('click', () => {
          // Disable all buttons in this question
          const allBtns = optionsGrid.querySelectorAll('.quiz-option-btn');
          allBtns.forEach(b => b.disabled = true);

          const isCorrect = (optIdx === q.answerIndex);
          if (isCorrect) {
            optBtn.classList.add('correct');
            triggerConfettiSmall();
          } else {
            optBtn.classList.add('wrong');
            // Highlight the correct one
            allBtns[q.answerIndex].classList.add('correct');
          }

          // Show explanation
          const expBox = document.createElement('div');
          expBox.className = 'quiz-explanation';
          expBox.innerHTML = `<strong>${isCorrect ? '✅ Correct!' : '❌ Not quite.'}</strong> ${q.explanation}`;
          card.appendChild(expBox);

          // Update score
          let answeredCorrect = 0;
          container.querySelectorAll('.quiz-question-card').forEach(c => {
            if (c.querySelector('.quiz-option-btn.correct:not([disabled])') || c.querySelector('.quiz-explanation strong')?.textContent.includes('Correct')) {
              answeredCorrect++;
            }
          });
          state.userProgress.quizScores[day.day] = Math.max(state.userProgress.quizScores[day.day] || 0, answeredCorrect);
          document.getElementById('quiz-score-val').textContent = state.userProgress.quizScores[day.day];
          saveUserProgress();
        });

        optionsGrid.appendChild(optBtn);
      });

      card.appendChild(optionsGrid);
      container.appendChild(card);
    });
  }

  // -------------------------------------------------------------------------
  // 10. Python Cheat Sheet View
  // -------------------------------------------------------------------------
  function renderCheatSheet() {
    const grid = document.getElementById('cheatsheet-grid');
    if (!grid || !window.CHEAT_SHEET_DATA) return;

    grid.innerHTML = '';
    const query = (document.getElementById('cheatsheet-search-input')?.value || '').toLowerCase().trim();

    window.CHEAT_SHEET_DATA.forEach(cat => {
      if (state.activeCategory !== 'all' && cat.category !== state.activeCategory) return;

      cat.items.forEach(item => {
        const matches = !query ||
          item.name.toLowerCase().includes(query) ||
          item.description.toLowerCase().includes(query) ||
          item.example.toLowerCase().includes(query);

        if (!matches) return;

        const card = document.createElement('div');
        card.className = 'cheatsheet-card';
        card.innerHTML = `
          <div class="cheatsheet-card-top">
            <span class="cheatsheet-title">${item.name}</span>
            <span class="cheatsheet-cat-badge">${cat.category}</span>
          </div>
          <p class="cheatsheet-desc">${item.description}</p>
          <div class="cheatsheet-example-wrap">
            <pre><code>${item.example}</code></pre>
          </div>
          <div class="cheatsheet-card-actions">
            <button class="btn-sm btn-ghost btn-copy-cs" title="Copy code">Copy</button>
            <button class="btn-sm btn-primary btn-run-cs" title="Run in Playground">⚡ Try</button>
          </div>
        `;

        card.querySelector('.btn-copy-cs').addEventListener('click', (e) => {
          navigator.clipboard.writeText(item.example);
          e.target.textContent = 'Copied!';
          setTimeout(() => { e.target.textContent = 'Copy'; }, 1500);
        });

        card.querySelector('.btn-run-cs').addEventListener('click', () => {
          switchMode('playground');
          const pgEditor = document.getElementById('pg-code-editor');
          if (pgEditor) {
            pgEditor.value = item.example;
            updateEditorLineNumbers(pgEditor, document.getElementById('pg-line-numbers'));
            document.getElementById('btn-pg-run').click();
          }
        });

        grid.appendChild(card);
      });
    });

    if (grid.children.length === 0) {
      grid.innerHTML = '<p style="color:var(--text-muted); grid-column:1/-1; text-align:center; padding:30px;">No cheat sheet items match your search.</p>';
    }
  }

  // -------------------------------------------------------------------------
  // 11. Interactive Event Bindings
  // -------------------------------------------------------------------------
  function bindEvents() {
    // Mode Navigation Tabs
    document.querySelectorAll('.nav-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        const mode = tab.dataset.mode;
        switchMode(mode);
      });
    });

    // Brand Home Click
    document.getElementById('brand-home')?.addEventListener('click', () => {
      state.activeDay = 1;
      switchMode('learn');
      renderSidebar();
      renderDayView();
    });

    // Sidebar Toggle
    const sidebar = document.getElementById('curriculum-sidebar');
    const sidebarToggle = document.getElementById('sidebar-toggle');
    sidebarToggle.addEventListener('click', () => {
      sidebar.classList.toggle('collapsed');
    });

    // Theme Toggle
    const themeBtn = document.getElementById('theme-toggle');
    themeBtn.addEventListener('click', () => {
      const isDark = document.body.classList.contains('theme-dark');
      document.body.className = isDark ? 'theme-light' : 'theme-dark';
      localStorage.setItem('pymaster30_theme', isDark ? 'light' : 'dark');
    });
    const savedTheme = localStorage.getItem('pymaster30_theme');
    if (savedTheme === 'light') {
      document.body.className = 'theme-light';
    }

    // Curriculum Search
    const searchInput = document.getElementById('curriculum-search-input');
    const clearSearchBtn = document.getElementById('clear-search-btn');
    searchInput.addEventListener('input', (e) => {
      state.searchQuery = e.target.value;
      clearSearchBtn.style.display = state.searchQuery ? 'block' : 'none';
      renderSidebar();
    });
    clearSearchBtn.addEventListener('click', () => {
      searchInput.value = '';
      state.searchQuery = '';
      clearSearchBtn.style.display = 'none';
      renderSidebar();
    });

    // Phase Filter Chips
    document.querySelectorAll('#phase-filters .filter-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        document.querySelectorAll('#phase-filters .filter-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        state.activePhase = chip.dataset.phase;
        renderSidebar();
      });
    });

    // Lesson Banner Action Buttons
    document.getElementById('btn-jump-to-practice').addEventListener('click', () => switchMode('practice'));
    document.getElementById('btn-open-day-quiz').addEventListener('click', () => switchMode('quiz'));

    // Mark Day Complete Toggle
    document.getElementById('btn-mark-day-read').addEventListener('click', () => {
      const dayNum = state.activeDay;
      const idx = state.userProgress.completedDays.indexOf(dayNum);
      if (idx === -1) {
        state.userProgress.completedDays.push(dayNum);
        triggerConfettiCelebration();
      } else {
        state.userProgress.completedDays.splice(idx, 1);
      }
      saveUserProgress();
      renderSidebar();
      renderDayView();
      updateGlobalProgressUI();
    });

    // Prev / Next Day Buttons
    document.getElementById('btn-prev-day').addEventListener('click', () => {
      if (state.activeDay > 1) {
        state.activeDay--;
        state.activeChallengeIndex = 0;
        renderSidebar();
        renderDayView();
        document.getElementById('main-content-area').scrollTop = 0;
      }
    });
    document.getElementById('btn-next-day').addEventListener('click', () => {
      if (state.activeDay < window.CURRICULUM_DATA.length) {
        state.activeDay++;
        state.activeChallengeIndex = 0;
        renderSidebar();
        renderDayView();
        document.getElementById('main-content-area').scrollTop = 0;
      }
    });

    // Practice Code Editor Events & Line Numbers
    const codeEditor = document.getElementById('code-editor');
    const lineNumbers = document.getElementById('editor-line-numbers');

    codeEditor.addEventListener('input', () => {
      updateEditorLineNumbers(codeEditor, lineNumbers);
      // Autosave to userProgress
      const day = window.CURRICULUM_DATA.find(d => d.day === state.activeDay);
      if (day && day.challenges[state.activeChallengeIndex]) {
        const chId = day.challenges[state.activeChallengeIndex].id;
        state.userProgress.savedCode[chId] = codeEditor.value;
        saveUserProgress();
      }
    });

    codeEditor.addEventListener('keydown', handleEditorKeyDown);

    // Practice Actions: Reset Code, Hint, Reference Solution
    document.getElementById('btn-reset-starter-code').addEventListener('click', () => {
      const day = window.CURRICULUM_DATA.find(d => d.day === state.activeDay);
      if (day && day.challenges[state.activeChallengeIndex]) {
        codeEditor.value = day.challenges[state.activeChallengeIndex].starterCode;
        updateEditorLineNumbers(codeEditor, lineNumbers);
      }
    });

    document.getElementById('btn-toggle-hint').addEventListener('click', () => {
      const drawer = document.getElementById('hint-drawer');
      drawer.style.display = (drawer.style.display === 'none') ? 'block' : 'none';
    });

    document.getElementById('btn-toggle-solution').addEventListener('click', () => {
      const drawer = document.getElementById('solution-drawer');
      drawer.style.display = (drawer.style.display === 'none') ? 'block' : 'none';
    });

    document.getElementById('btn-copy-solution').addEventListener('click', (e) => {
      const sol = document.getElementById('solution-code').textContent;
      navigator.clipboard.writeText(sol);
      e.target.textContent = 'Copied!';
      setTimeout(() => { e.target.textContent = 'Copy'; }, 1500);
    });

    // Clear Terminal Console
    document.getElementById('btn-clear-console').addEventListener('click', () => {
      document.getElementById('terminal-output').innerHTML = '<div class="terminal-line info">Console cleared.</div>';
    });

    // Run Code Button in Practice
    document.getElementById('btn-run-code').addEventListener('click', async () => {
      const terminal = document.getElementById('terminal-output');
      const timeBadge = document.getElementById('exec-time-badge');
      const code = codeEditor.value;

      terminal.innerHTML = '<div class="terminal-line info">⏳ Executing code...</div>';
      const res = await executePythonCode(code);

      timeBadge.textContent = `${res.durationMs}ms`;
      terminal.innerHTML = '';

      if (res.stdout) {
        terminal.innerHTML += `<div class="terminal-line stdout">${escapeHtml(res.stdout)}</div>`;
      }
      if (res.stderr) {
        terminal.innerHTML += `<div class="terminal-line error">${escapeHtml(res.stderr)}</div>`;
      }
      if (!res.stdout && !res.stderr) {
        terminal.innerHTML += '<div class="terminal-line info">(Code executed successfully with no output)</div>';
      }
      terminal.scrollTop = terminal.scrollHeight;
    });

    // Verify & Run Tests in Practice
    document.getElementById('btn-verify-tests').addEventListener('click', async () => {
      const day = window.CURRICULUM_DATA.find(d => d.day === state.activeDay);
      if (!day || !day.challenges[state.activeChallengeIndex]) return;

      const currentCh = day.challenges[state.activeChallengeIndex];
      const testCode = currentCh.testCode;
      const userCode = codeEditor.value;

      const testResultsBody = document.getElementById('test-results-body');
      const testStatusPill = document.getElementById('test-summary-pill');
      const terminal = document.getElementById('terminal-output');
      const timeBadge = document.getElementById('exec-time-badge');

      testStatusPill.className = 'test-status-pill';
      testStatusPill.textContent = 'Running tests...';
      testResultsBody.innerHTML = '<p class="test-placeholder">⏳ Evaluating assertions against your output and variables...</p>';

      const result = await runChallengeTests(userCode, testCode);

      timeBadge.textContent = `${result.durationMs}ms`;
      terminal.innerHTML = '';
      if (result.stdout) {
        terminal.innerHTML += `<div class="terminal-line stdout">${escapeHtml(result.stdout)}</div>`;
      }
      if (result.stderr) {
        terminal.innerHTML += `<div class="terminal-line error">${escapeHtml(result.stderr)}</div>`;
      }
      terminal.scrollTop = terminal.scrollHeight;

      if (result.passed) {
        testStatusPill.className = 'test-status-pill pass';
        testStatusPill.textContent = 'All Tests Passed! 🎉';
        testResultsBody.innerHTML = `
          <div class="test-item pass">
            <span>✅</span>
            <div><strong>Pass:</strong> ${escapeHtml(result.message)}</div>
          </div>
        `;

        // Mark challenge as solved
        if (!state.userProgress.solvedChallenges.includes(currentCh.id)) {
          state.userProgress.solvedChallenges.push(currentCh.id);
          saveUserProgress();
        }

        // Check if all challenges for today are solved
        const allDaySolved = day.challenges.every(c => state.userProgress.solvedChallenges.includes(c.id));
        if (allDaySolved && !state.userProgress.completedDays.includes(day.day)) {
          state.userProgress.completedDays.push(day.day);
          saveUserProgress();
        }

        triggerConfettiCelebration();
        renderPracticeView(day);
        renderSidebar();
        updateGlobalProgressUI();
      } else {
        testStatusPill.className = 'test-status-pill fail';
        testStatusPill.textContent = 'Tests Failed';
        testResultsBody.innerHTML = `
          <div class="test-item fail">
            <span>❌</span>
            <div><strong>Failed Assertion:</strong> ${escapeHtml(result.message)}</div>
          </div>
        `;
      }
    });

    // -----------------------------------------------------------------------
    // Playground Mode Logic
    // -----------------------------------------------------------------------
    const pgModeScript = document.getElementById('pg-mode-script');
    const pgModeRepl = document.getElementById('pg-mode-repl');
    const pgViewScript = document.getElementById('pg-view-script');
    const pgViewRepl = document.getElementById('pg-view-repl');

    pgModeScript.addEventListener('click', () => {
      pgModeScript.classList.add('active');
      pgModeRepl.classList.remove('active');
      pgViewScript.classList.add('active');
      pgViewRepl.classList.remove('active');
      state.activePgMode = 'script';
    });

    pgModeRepl.addEventListener('click', () => {
      pgModeRepl.classList.add('active');
      pgModeScript.classList.remove('active');
      pgViewRepl.classList.add('active');
      pgViewScript.classList.remove('active');
      state.activePgMode = 'repl';
      document.getElementById('repl-input').focus();
    });

    // Playground Template Dropdown
    const templateSelect = document.getElementById('template-select');
    templateSelect.addEventListener('change', () => {
      const key = templateSelect.value;
      if (CODE_TEMPLATES[key]) {
        const pgEditor = document.getElementById('pg-code-editor');
        pgEditor.value = CODE_TEMPLATES[key];
        updateEditorLineNumbers(pgEditor, document.getElementById('pg-line-numbers'));
      }
    });

    // Playground Script Run
    const pgEditor = document.getElementById('pg-code-editor');
    const pgLineNumbers = document.getElementById('pg-line-numbers');
    pgEditor.addEventListener('input', () => updateEditorLineNumbers(pgEditor, pgLineNumbers));
    pgEditor.addEventListener('keydown', handleEditorKeyDown);

    document.getElementById('btn-pg-run').addEventListener('click', async () => {
      const consoleOut = document.getElementById('pg-terminal-output');
      const code = pgEditor.value;

      consoleOut.innerHTML = '<div class="terminal-line info">⏳ Running script...</div>';
      const res = await executePythonCode(code);

      consoleOut.innerHTML = '';
      if (res.stdout) {
        consoleOut.innerHTML += `<div class="terminal-line stdout">${escapeHtml(res.stdout)}</div>`;
      }
      if (res.stderr) {
        consoleOut.innerHTML += `<div class="terminal-line error">${escapeHtml(res.stderr)}</div>`;
      }
      if (!res.stdout && !res.stderr) {
        consoleOut.innerHTML += '<div class="terminal-line info">(Done with no output)</div>';
      }
      consoleOut.scrollTop = consoleOut.scrollHeight;
    });

    document.getElementById('btn-clear-pg-console').addEventListener('click', () => {
      document.getElementById('pg-terminal-output').innerHTML = '<div class="terminal-line info">Console cleared.</div>';
    });

    // REPL Console Input Handler
    const replInput = document.getElementById('repl-input');
    const replHistory = document.getElementById('repl-history');

    replInput.addEventListener('keydown', async (e) => {
      if (e.key === 'Enter') {
        const cmd = replInput.value.trim();
        if (!cmd) return;

        state.replHistory.push(cmd);
        state.replHistoryIndex = state.replHistory.length;
        replInput.value = '';

        // Render command in history
        const entry = document.createElement('div');
        entry.className = 'repl-entry';
        entry.innerHTML = `<div class="repl-cmd-row"><span>&gt;&gt;&gt;</span> <span>${escapeHtml(cmd)}</span></div>`;
        replHistory.appendChild(entry);

        // Evaluate in Pyodide or server
        const wrappedCode = `
try:
    __repl_res = eval(${JSON.stringify(cmd)})
    if __repl_res is not None:
        print(repr(__repl_res))
except SyntaxError:
    exec(${JSON.stringify(cmd)})
`;
        const res = await executePythonCode(wrappedCode);
        const outRow = document.createElement('div');

        if (res.stderr) {
          outRow.className = 'repl-out-row error';
          outRow.textContent = res.stderr;
        } else if (res.stdout) {
          outRow.className = 'repl-out-row';
          outRow.textContent = res.stdout;
        }
        entry.appendChild(outRow);
        replHistory.scrollTop = replHistory.scrollHeight;
      } else if (e.key === 'ArrowUp') {
        if (state.replHistoryIndex > 0) {
          state.replHistoryIndex--;
          replInput.value = state.replHistory[state.replHistoryIndex];
        }
      } else if (e.key === 'ArrowDown') {
        if (state.replHistoryIndex < state.replHistory.length - 1) {
          state.replHistoryIndex++;
          replInput.value = state.replHistory[state.replHistoryIndex];
        } else {
          state.replHistoryIndex = state.replHistory.length;
          replInput.value = '';
        }
      }
    });

    // -----------------------------------------------------------------------
    // Quiz Actions
    // -----------------------------------------------------------------------
    document.getElementById('btn-retake-quiz').addEventListener('click', () => {
      const day = window.CURRICULUM_DATA.find(d => d.day === state.activeDay);
      if (day) renderQuizView(day);
    });

    document.getElementById('btn-quiz-next-day').addEventListener('click', () => {
      if (state.activeDay < window.CURRICULUM_DATA.length) {
        state.activeDay++;
        state.activeChallengeIndex = 0;
        renderSidebar();
        renderDayView();
      }
    });

    // -----------------------------------------------------------------------
    // Cheat Sheet Filter Chips & Search
    // -----------------------------------------------------------------------
    document.querySelectorAll('#cheatsheet-category-chips .filter-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        document.querySelectorAll('#cheatsheet-category-chips .filter-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        state.activeCategory = chip.dataset.cat;
        renderCheatSheet();
      });
    });

    document.getElementById('cheatsheet-search-input').addEventListener('input', () => {
      renderCheatSheet();
    });

    // -----------------------------------------------------------------------
    // Settings Modal
    // -----------------------------------------------------------------------
    const modal = document.getElementById('options-modal');
    document.getElementById('options-btn').addEventListener('click', () => { modal.style.display = 'flex'; });
    document.getElementById('btn-close-options').addEventListener('click', () => { modal.style.display = 'none'; });
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.style.display = 'none'; });

    document.getElementById('btn-export-progress').addEventListener('click', () => {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state.userProgress, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", "pymaster30_progress.json");
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    });

    document.getElementById('btn-reset-progress').addEventListener('click', () => {
      if (confirm('Are you sure you want to reset all your learning progress? This cannot be undone.')) {
        state.userProgress = {
          completedDays: [],
          solvedChallenges: [],
          quizScores: {},
          savedCode: {},
          streak: 1,
          lastActiveDate: new Date().toISOString().split('T')[0]
        };
        saveUserProgress();
        modal.style.display = 'none';
        renderSidebar();
        renderDayView();
        updateGlobalProgressUI();
      }
    });
  }

  // -------------------------------------------------------------------------
  // 12. Helper Functions
  // -------------------------------------------------------------------------
  function switchMode(mode) {
    state.activeMode = mode;
    document.querySelectorAll('.nav-tab').forEach(t => {
      t.classList.toggle('active', t.dataset.mode === mode);
    });
    document.querySelectorAll('.view-panel').forEach(p => {
      p.classList.toggle('active', p.id === `view-${mode}`);
    });
    document.getElementById('main-content-area').scrollTop = 0;
  }

  function handleEditorKeyDown(e) {
    // Tab key -> 4 spaces
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = this.selectionStart;
      const end = this.selectionEnd;
      this.value = this.value.substring(0, start) + '    ' + this.value.substring(end);
      this.selectionStart = this.selectionEnd = start + 4;
      this.dispatchEvent(new Event('input'));
    }
    // Ctrl+Enter or Cmd+Enter -> Run
    else if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      if (e.shiftKey) {
        document.getElementById('btn-verify-tests')?.click();
      } else {
        if (state.activeMode === 'practice') {
          document.getElementById('btn-run-code')?.click();
        } else if (state.activeMode === 'playground') {
          document.getElementById('btn-pg-run')?.click();
        }
      }
    }
  }

  function updateEditorLineNumbers(textarea, lineContainer) {
    const lines = textarea.value.split('\n').length;
    let numbers = '';
    for (let i = 1; i <= Math.max(lines, 1); i++) {
      numbers += i + '\n';
    }
    lineContainer.textContent = numbers;
  }

  function updateGlobalProgressUI() {
    const totalDays = window.CURRICULUM_DATA ? window.CURRICULUM_DATA.length : 30;
    const completed = state.userProgress.completedDays.length;
    const pct = Math.round((completed / totalDays) * 100);

    const bar = document.getElementById('global-progress-bar');
    if (bar) bar.style.width = `${Math.max(pct, 3)}%`;

    const text = document.getElementById('global-progress-text');
    if (text) text.textContent = `${completed} / ${totalDays} Days (${pct}%)`;

    const streakEl = document.getElementById('streak-count');
    if (streakEl) streakEl.textContent = state.userProgress.streak || 1;
  }

  function checkDailyStreak() {
    const today = new Date().toISOString().split('T')[0];
    const lastDate = state.userProgress.lastActiveDate;

    if (!lastDate) {
      state.userProgress.lastActiveDate = today;
      state.userProgress.streak = 1;
    } else if (lastDate !== today) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      if (lastDate === yesterdayStr) {
        state.userProgress.streak = (state.userProgress.streak || 1) + 1;
      } else {
        // Streak reset
        state.userProgress.streak = 1;
      }
      state.userProgress.lastActiveDate = today;
      saveUserProgress();
    }
  }

  function loadUserProgress() {
    const raw = localStorage.getItem('pymaster30_progress');
    if (raw) {
      try {
        state.userProgress = Object.assign(state.userProgress, JSON.parse(raw));
      } catch (e) {}
    }
    // Also try fetching from server
    fetch('/api/progress')
      .then(r => r.json())
      .then(serverProgress => {
        if (serverProgress && serverProgress.completedDays) {
          state.userProgress = Object.assign(state.userProgress, serverProgress);
          saveUserProgress(false);
          renderSidebar();
          updateGlobalProgressUI();
        }
      })
      .catch(() => {});
  }

  function saveUserProgress(syncServer = true) {
    localStorage.setItem('pymaster30_progress', JSON.stringify(state.userProgress));
    if (syncServer) {
      fetch('/api/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(state.userProgress)
      }).catch(() => {});
    }
  }

  function triggerConfettiCelebration() {
    if (window.confetti) {
      window.confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    }
  }

  function triggerConfettiSmall() {
    if (window.confetti) {
      window.confetti({
        particleCount: 35,
        spread: 45,
        origin: { y: 0.7 }
      });
    }
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

})();
