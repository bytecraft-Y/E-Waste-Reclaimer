// E-Waste Hardware Reclaimer - Main Application Logic
// Orchestrates user interaction, state management, and view updates

const ECO_DIY_RECIPES = [
  {
    name: "LED PWM Dimmer / Motor Controller",
    description: "Build a high-efficiency controller to dim LED strips or regulate DC toy motor speeds without wasting heat.",
    difficulty: "Easy",
    required: [
      { subcategory: "transistor", name: "MOSFET", qty: 1 },
      { subcategory: "resistor", name: "Potentiometer", qty: 1 },
      { subcategory: "resistor", name: "Resistor", qty: 1 }
    ],
    schematicTip: "Connect the potentiometer middle pin to the MOSFET gate through a current-limiting resistor to throttle current."
  },
  {
    name: "DIY Active Audio Preamplifier",
    description: "An active pre-amp circuit to boost signals from weak audio inputs or microphones before feeding to speakers.",
    difficulty: "Moderate",
    required: [
      { subcategory: "ic", name: "Op-Amp", qty: 1 },
      { subcategory: "capacitor", name: "Electrolytic Capacitor", qty: 2 },
      { subcategory: "resistor", name: "Resistor", qty: 3 }
    ],
    schematicTip: "Use the electrolytic capacitors on the input and output lines to block DC voltage offset while passing AC audio signals."
  },
  {
    name: "Electronic Morse Code Trainer",
    description: "A simple code key oscillator for learning and practicing Morse code signals.",
    difficulty: "Easy",
    required: [
      { subcategory: "audio", name: "Buzzer", qty: 1 },
      { subcategory: "switch", name: "Tactile Switch", qty: 1 },
      { subcategory: "power", name: "Coin Cell Holder", qty: 1 }
    ],
    schematicTip: "Wire the tactile switch in series between the coin cell holder positive contact and the buzzer positive pin."
  },
  {
    name: "Solar Charging Supercapacitor Bank",
    description: "Store green solar energy in high-capacity supercapacitors. Battery-free, eco-friendly energy reservoir.",
    difficulty: "Hard",
    required: [
      { subcategory: "diode", name: "Schottky Diode", qty: 1 },
      { subcategory: "capacitor", name: "Supercapacitor", qty: 1 },
      { subcategory: "ic", name: "Linear Voltage Regulator", qty: 1 }
    ],
    schematicTip: "Install the Schottky diode in series with the solar panel output to prevent the supercapacitor from discharging back into the solar panel at night."
  },
  {
    name: "Input Overvoltage & Protection Shield",
    description: "A defensive power strip shield to protect delicate microcontroller boards from voltage spikes and surges.",
    difficulty: "Moderate",
    required: [
      { subcategory: "resistor", name: "Varistor", qty: 1 },
      { subcategory: "protection", name: "Fuse", qty: 1 },
      { subcategory: "switch", name: "Toggle Switch", qty: 1 }
    ],
    schematicTip: "Connect the fuse in series on the active power line and mount the Metal Oxide Varistor (MOV) in parallel across the active and neutral inputs."
  }
];

document.addEventListener('DOMContentLoaded', () => {
  // Initialize Analyzer
  const database = window.COMPONENT_DATABASE || [];
  const analyzer = new ComponentAnalyzer(database);

  // Application State
  let currentList = [];
  let selectedComponent = null;

  // DOM Elements - Tabs
  const tabButtons = document.querySelectorAll('.tab-btn');
  const inputPanes = document.querySelectorAll('.input-pane');

  // DOM Elements - Single Add
  const searchInput = document.getElementById('search-input');
  const suggestionsDropdown = document.getElementById('suggestions-dropdown');
  const singleQtyInput = document.getElementById('single-qty');
  const addSingleBtn = document.getElementById('add-single-btn');

  // DOM Elements - BOM Paste
  const bomTextarea = document.getElementById('bom-textarea');
  const analyzeBomBtn = document.getElementById('analyze-bom-btn');
  const loadSampleBtn = document.getElementById('load-sample-btn');

  // DOM Elements - Quick Picks
  const quickPickContainer = document.getElementById('quick-pick-container');

  // DOM Elements - Statistics
  const statTotalItems = document.getElementById('stat-total-items');
  const statDivertedWeight = document.getElementById('stat-diverted-weight');
  const statTotalValue = document.getElementById('stat-total-value');
  const statHazardCount = document.getElementById('stat-hazard-count');

  // DOM Elements - Columns
  const listSalvageable = document.getElementById('list-salvageable');
  const listRecyclable = document.getElementById('list-recyclable');
  const listHazardous = document.getElementById('list-hazardous');

  // DOM Elements - Counter Badges
  const badgeSalvageable = document.getElementById('badge-salvageable');
  const badgeRecyclable = document.getElementById('badge-recyclable');
  const badgeHazardous = document.getElementById('badge-hazardous');

  // DOM Elements - Drawer Modal
  const overlayDrawer = document.getElementById('overlay-drawer');
  const drawerBackdrop = document.getElementById('drawer-backdrop');
  const drawerClose = document.getElementById('drawer-close');
  const drawerContent = document.getElementById('drawer-content');

  // DOM Elements - Actions
  const btnReset = document.getElementById('btn-reset');
  const btnExport = document.getElementById('btn-export');
  const recipesGrid = document.getElementById('recipes-grid');

  // --- TAB NAVIGATION ---
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetPane = btn.dataset.tab;
      
      tabButtons.forEach(b => b.classList.remove('active'));
      inputPanes.forEach(p => p.classList.remove('active'));

      btn.classList.add('active');
      document.getElementById(`pane-${targetPane}`).classList.add('active');
    });
  });

  // --- POPULATE QUICK PICK CHIPS ---
  const popularChips = [
    "Electrolytic Capacitor", "Resistor", "MOSFET", "555 Timer", "Microcontroller", 
    "Relay", "Tactile Switch", "USB Port", "Stepper Motor", "Heatsink", 
    "Buzzer", "LCD Screen", "Linear Voltage Regulator", "Mercury Switch"
  ];

  popularChips.forEach(name => {
    const chip = document.createElement('button');
    chip.className = 'quick-btn';
    chip.textContent = name;
    chip.type = 'button';
    chip.addEventListener('click', () => {
      searchInput.value = name;
      suggestionsDropdown.style.display = 'none';
      singleQtyInput.focus();
    });
    quickPickContainer.appendChild(chip);
  });

  // --- AUTOCOMPLETE SEARCH DROPDOWN ---
  searchInput.addEventListener('input', () => {
    const query = searchInput.value.toLowerCase().trim();
    if (!query) {
      suggestionsDropdown.style.display = 'none';
      return;
    }

    // Filter database for suggestions matching the query
    const matches = database.filter(item => {
      return item.names.some(alias => alias.includes(query)) ||
             item.subcategory.includes(query) ||
             item.category.includes(query);
    }).slice(0, 5); // Limit to top 5 suggestions

    if (matches.length === 0) {
      suggestionsDropdown.style.display = 'none';
      return;
    }

    suggestionsDropdown.innerHTML = '';
    matches.forEach(item => {
      const div = document.createElement('div');
      div.className = 'suggestion-item';
      
      // Determine badge class
      let badgeClass = 'cat-badge-recyclable';
      if (item.classification === 'salvageable') badgeClass = 'cat-badge-salvageable';
      if (item.classification === 'hazardous') badgeClass = 'cat-badge-hazardous';

      div.innerHTML = `
        <span class="suggestion-name">${Utils.escapeHtml(item.names[0])}</span>
        <span class="suggestion-cat ${badgeClass}">${Utils.escapeHtml(item.classification)}</span>
      `;

      div.addEventListener('click', () => {
        searchInput.value = item.names[0];
        suggestionsDropdown.style.display = 'none';
        singleQtyInput.focus();
      });

      suggestionsDropdown.appendChild(div);
    });

    suggestionsDropdown.style.display = 'block';
  });

  // Close suggestion dropdown if clicked outside
  document.addEventListener('click', (e) => {
    if (!searchInput.contains(e.target) && !suggestionsDropdown.contains(e.target)) {
      suggestionsDropdown.style.display = 'none';
    }
  });

  // --- ADD SINGLE COMPONENT ---
  const addSingleComponent = () => {
    const text = searchInput.value.trim();
    const qty = parseInt(singleQtyInput.value, 10) || 1;

    if (!text) {
      alert("Please enter a component description first.");
      return;
    }

    // Format query string with quantity prefix to leverage BOM parsing helpers
    const fullLine = `${qty}x ${text}`;
    const result = analyzer.analyzeLine(fullLine);

    if (result) {
      addComponentToList(result);
      searchInput.value = '';
      singleQtyInput.value = '1';
      updateUI();
    }
  };

  addSingleBtn.addEventListener('click', addSingleComponent);
  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addSingleComponent();
    }
  });

  // --- ADD BOM MULTIPLE COMPONENTS ---
  analyzeBomBtn.addEventListener('click', () => {
    const text = bomTextarea.value.trim();
    if (!text) {
      alert("Please paste a list of components or bill of materials.");
      return;
    }

    const results = analyzer.analyzeBOM(text);
    if (results.length === 0) {
      alert("Could not identify any components. Please check the format.");
      return;
    }

    results.forEach(res => addComponentToList(res));
    bomTextarea.value = '';
    updateUI();
    
    // Switch tab back to list or scroll down
    document.querySelector('[data-tab="list"]')?.click();
  });

  // --- SEED SAMPLE DATA ---
  loadSampleBtn.addEventListener('click', () => {
    const sampleBOM = `10x Electrolytic Capacitor
2x Power MOSFET
5x Carbon Film Resistor
1x Bulging Electrolytic Capacitor
1x Old PCB oil capacitor
1x Stepper motor
1x Mercury switch
3x Tactile switch
1x Power transformer
1x ATmega328p microcontroller
2x Heatsink
1x LCD screen`;

    bomTextarea.value = sampleBOM;
  });

  // --- APP STATE MUTATIONS ---
  const addComponentToList = (item) => {
    // Check if component already exists with same name and classification
    const existingIndex = currentList.findIndex(x => 
      x.component.name === item.component.name && 
      x.component.classification === item.component.classification &&
      JSON.stringify(x.conditions) === JSON.stringify(item.conditions)
    );

    if (existingIndex > -1) {
      currentList[existingIndex].quantity += item.quantity;
    } else {
      currentList.push(item);
    }
  };

  const removeComponentFromList = (index) => {
    currentList.splice(index, 1);
    updateUI();
  };

  // --- UPDATE UI RENDER ---
  const updateUI = () => {
    // Separate into categories
    const salvageable = [];
    const recyclable = [];
    const hazardous = [];

    currentList.forEach((item, index) => {
      // Attach index to trace back on removal or selection
      const itemWithIndex = { ...item, originalIndex: index };
      if (item.component.classification === 'salvageable') salvageable.push(itemWithIndex);
      else if (item.component.classification === 'recyclable') recyclable.push(itemWithIndex);
      else if (item.component.classification === 'hazardous') hazardous.push(itemWithIndex);
    });

    // Update Category Counters
    badgeSalvageable.textContent = salvageable.length;
    badgeRecyclable.textContent = recyclable.length;
    badgeHazardous.textContent = hazardous.length;

    // Render Lists
    renderColumn(listSalvageable, salvageable, 'salvageable');
    renderColumn(listRecyclable, recyclable, 'recyclable');
    renderColumn(listHazardous, hazardous, 'hazardous');

    // Aggregate Stats and Animate
    const stats = ComponentAnalyzer.aggregateStats(currentList);
    
    // Dynamic counts
    Utils.animateCount(statTotalItems, stats.totalItems);
    Utils.animateCount(statTotalValue, stats.totalValue, 1000, true);
    Utils.animateCount(statHazardCount, stats.hazardousCount);

    // Diverted weight needs text formatting
    const weightGrams = stats.totalWeightGrams;
    if (weightGrams >= 1000) {
      const kg = parseFloat((weightGrams / 1000).toFixed(2));
      Utils.animateCount(statDivertedWeight, kg, 1000, false, ' kg');
    } else {
      Utils.animateCount(statDivertedWeight, weightGrams, 1000, false, ' g');
    }

    // Enable/Disable Action buttons
    if (currentList.length > 0) {
      btnReset.removeAttribute('disabled');
      btnExport.removeAttribute('disabled');
    } else {
      btnReset.setAttribute('disabled', 'true');
      btnExport.setAttribute('disabled', 'true');
    }

    // Live update Project Sandbox
    updateRecipesSandbox();
  };

  // Live match inventory to Green DIY project recipes
  const updateRecipesSandbox = () => {
    recipesGrid.innerHTML = '';
    
    if (currentList.length === 0) {
      recipesGrid.innerHTML = `
        <div class="empty-col-msg" style="grid-column: 1 / -1; padding: 40px 20px;">
          <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H7c0-2.76 2.24-5 5-5s5 2.24 5 5c0 1.04-.42 1.99-1.07 2.75z"/></svg>
          <p>Your Project Sandbox is empty. Add components to automatically match green DIY building recipes!</p>
        </div>
      `;
      return;
    }

    ECO_DIY_RECIPES.forEach(recipe => {
      let totalRequiredQty = 0;
      let totalHavedQty = 0;
      const partStatusList = [];

      recipe.required.forEach(req => {
        totalRequiredQty += req.qty;
        
        // Match parts in currentList by subcategory OR name
        const matches = currentList.filter(item => {
          const comp = item.component;
          const subcatMatch = comp.subcategory.toLowerCase() === req.subcategory.toLowerCase();
          const nameMatch = comp.name.toLowerCase().includes(req.name.toLowerCase());
          // Only reuse safe parts (do not use hazardous parts)
          return (subcatMatch || nameMatch) && comp.classification !== 'hazardous';
        });

        const totalHavedForReq = matches.reduce((sum, item) => sum + item.quantity, 0);
        totalHavedQty += Math.min(totalHavedForReq, req.qty);

        partStatusList.push({
          ...req,
          have: totalHavedForReq,
          satisfied: totalHavedForReq >= req.qty
        });
      });

      const matchPercent = Math.round((totalHavedQty / totalRequiredQty) * 100);
      const isUnlocked = matchPercent === 100;

      const card = document.createElement('div');
      card.className = `recipe-card ${isUnlocked ? 'recipe-unlocked' : ''}`;
      
      const progressFillWidth = `${matchPercent}%`;
      const tipBox = isUnlocked 
        ? `<div class="recipe-tip-box">💡 <strong>Build Tip:</strong> ${Utils.escapeHtml(recipe.schematicTip)}</div>`
        : `<div class="recipe-tip-box" style="background:none; border:none; color:var(--text-muted); padding:0;">Collect all parts to unlock schematics tips.</div>`;

      const partsHtml = partStatusList.map(p => {
        const itemClass = p.satisfied ? 'part-have' : 'part-missing';
        return `
          <li class="recipe-part-item ${itemClass}">
            <span class="recipe-part-dot"></span>
            <span>${p.qty}x ${p.name} (Have: ${p.have}/${p.qty})</span>
          </li>
        `;
      }).join('');

      card.innerHTML = `
        <div>
          <div class="recipe-title">${Utils.escapeHtml(recipe.name)}</div>
          <div class="recipe-desc">${Utils.escapeHtml(recipe.description)}</div>
          
          <div class="recipe-progress-container">
            <div class="recipe-progress-text">
              <span>Match Status</span>
              <span>${matchPercent}%</span>
            </div>
            <div class="recipe-progress-bar">
              <div class="recipe-progress-fill" style="width: ${progressFillWidth}"></div>
            </div>
          </div>
          
          <ul class="recipe-parts-list">
            ${partsHtml}
          </ul>
        </div>
        ${tipBox}
      `;

      recipesGrid.appendChild(card);
    });
  };

  // Render a specific category column
  const renderColumn = (container, list, categoryType) => {
    container.innerHTML = '';

    if (list.length === 0) {
      let icon = '';
      let msg = '';
      if (categoryType === 'salvageable') {
        icon = `<svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>`;
        msg = 'No salvageable parts listed. Extract premium microchips, relays, and coils.';
      } else if (categoryType === 'recyclable') {
        icon = `<svg viewBox="0 0 24 24"><path d="M19 8l-4 4h3c0 3.31-2.69 6-6 6-1.01 0-1.97-.25-2.8-.7l-1.46 1.46C8.97 19.54 10.43 20 12 20c4.42 0 8-3.58 8-8h3l-4-4zM6 12c0-3.31 2.69-6 6-6 1.01 0 1.97.25 2.8.7l1.46-1.46C15.03 4.46 13.57 4 12 4c-4.42 0-8 3.58-8 8H1l4 4 4-4H6z"/></svg>`;
        msg = 'No standard recyclables. Diodes, ceramic caps, and pins go here.';
      } else {
        icon = `<svg viewBox="0 0 24 24"><path d="M12 2L1 21h22L12 2zm1 14h-2v-2h2v2zm0-4h-2V8h2v4z"/></svg>`;
        msg = 'No hazardous items flagged. Battery cells and mercury switches appear here.';
      }
      container.innerHTML = `
        <div class="empty-col-msg">
          ${icon}
          <p>${msg}</p>
        </div>
      `;
      return;
    }

    list.forEach(item => {
      const card = document.createElement('div');
      card.className = 'component-card';
      
      const valText = item.component.estimatedValue > 0 
        ? Utils.formatCurrency(item.component.estimatedValue * item.quantity) 
        : 'Disposal Cost';

      card.innerHTML = `
        <div class="card-top">
          <span class="card-qty">${item.quantity}x</span>
          <button class="card-remove" title="Remove element" data-index="${item.originalIndex}">&times;</button>
        </div>
        <div class="card-name">${Utils.escapeHtml(item.component.name)}</div>
        <div class="card-desc">${Utils.escapeHtml(item.component.subcategory)} &bull; ${Utils.escapeHtml(item.component.package)}</div>
        <div class="card-bottom">
          <span class="card-badge">Diff: ${item.component.desolderDifficulty}/5</span>
          <span class="card-val">${valText}</span>
        </div>
      `;

      // Prevent detail modal opening if clicking the remove button
      card.querySelector('.card-remove').addEventListener('click', (e) => {
        e.stopPropagation();
        const index = parseInt(e.target.dataset.index, 10);
        removeComponentFromList(index);
      });

      // Card click opens drawer details
      card.addEventListener('click', () => {
        openDetailDrawer(item);
      });

      container.appendChild(card);
    });
  };

  // --- DRAWER DETAILS RENDERING ---
  const openDetailDrawer = (item) => {
    selectedComponent = item;
    const comp = item.component;

    // Classification Badge
    let classificationBadge = `<span class="drawer-badge drawer-badge-recycle">Recyclable</span>`;
    if (comp.classification === 'salvageable') {
      classificationBadge = `<span class="drawer-badge drawer-badge-salvage">🟢 Salvageable (Keep)</span>`;
    } else if (comp.classification === 'hazardous') {
      classificationBadge = `<span class="drawer-badge drawer-badge-hazard">🔴 Hazardous (Disposal)</span>`;
    }

    // Hazards block
    let hazardsBlock = '';
    if (comp.hazards && comp.hazards.length > 0) {
      hazardsBlock = `
        <div class="drawer-row">
          <div class="drawer-label">Hazards Identified</div>
          <div class="drawer-warning">
            <strong>Active Threats:</strong> ${comp.hazards.map(h => Utils.escapeHtml(h)).join(', ')}
          </div>
        </div>
      `;
    }

    // Repurpose list
    let repurposeList = '';
    if (comp.repurposeIdeas && comp.repurposeIdeas.length > 0) {
      repurposeList = `
        <div class="drawer-row">
          <div class="drawer-label">Repurposing Ideas</div>
          <ul class="ideas-list">
            ${comp.repurposeIdeas.map(idea => `<li>${Utils.escapeHtml(idea)}</li>`).join('')}
          </ul>
        </div>
      `;
    }

    // Build the drawer content
    drawerContent.innerHTML = `
      <div class="drawer-row">
        <div class="drawer-label">Component Type</div>
        <div class="drawer-val" style="font-weight: 600; font-size: 16px;">
          ${Utils.escapeHtml(comp.name)}
        </div>
        ${classificationBadge}
      </div>

      <div class="drawer-row" style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
        <div>
          <div class="drawer-label">Package Form</div>
          <div class="drawer-val" style="text-transform: capitalize;">${Utils.escapeHtml(comp.package)}</div>
        </div>
        <div>
          <div class="drawer-label">Subcategory</div>
          <div class="drawer-val" style="text-transform: capitalize;">${Utils.escapeHtml(comp.subcategory)}</div>
        </div>
      </div>

      <div class="drawer-row" style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
        <div>
          <div class="drawer-label">Est. Unit Value</div>
          <div class="drawer-val" style="font-weight: bold; color: var(--color-salvage)">
            ${comp.estimatedValue > 0 ? Utils.formatCurrency(comp.estimatedValue) : 'N/A'}
          </div>
        </div>
        <div>
          <div class="drawer-label">Weight Class</div>
          <div class="drawer-val">${ComponentAnalyzer.getComponentWeight(comp.category, comp.subcategory)} g</div>
        </div>
      </div>

      <div class="drawer-row">
        <div class="drawer-label">Desoldering Difficulty</div>
        <span class="diff-badge ${Utils.getDifficultyClass(comp.desolderDifficulty)}">
          ${Utils.getDifficultyLabel(comp.desolderDifficulty)}
        </span>
      </div>

      ${hazardsBlock}
      ${repurposeList}

      <div class="drawer-row">
        <div class="drawer-label">Safety & Handling Notes</div>
        <div class="drawer-val" style="font-size: 13px; color: var(--text-muted);">
          ${Utils.escapeHtml(comp.safetyNotes || 'No specific safety notes. Handle with standard caution.')}
        </div>
      </div>

      <div class="drawer-row">
        <div class="drawer-label">Disposal & Recycling Instructions</div>
        <div class="drawer-val" style="font-size: 13px; color: var(--text-muted);">
          ${Utils.escapeHtml(comp.recyclingInfo || 'Send to local e-waste recycling terminal.')}
        </div>
      </div>
    `;

    // Open animations
    overlayDrawer.classList.add('open');
    drawerBackdrop.classList.add('active');
  };

  const closeDetailDrawer = () => {
    overlayDrawer.classList.remove('open');
    drawerBackdrop.classList.remove('active');
    selectedComponent = null;
  };

  drawerClose.addEventListener('click', closeDetailDrawer);
  drawerBackdrop.addEventListener('click', closeDetailDrawer);

  // --- ACTIONS: RESET & EXPORT ---
  btnReset.addEventListener('click', () => {
    if (confirm("Are you sure you want to clear the current component list?")) {
      currentList = [];
      closeDetailDrawer();
      updateUI();
    }
  });

  btnExport.addEventListener('click', () => {
    if (currentList.length === 0) return;
    const stats = ComponentAnalyzer.aggregateStats(currentList);
    Utils.printReport(currentList, stats);
  });

  // Initial load run
  updateUI();
});
