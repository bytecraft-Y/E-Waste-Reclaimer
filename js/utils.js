// E-Waste Hardware Reclaimer - Utilities
// Helper functions for formatting, printing, and UI enhancements

const Utils = {
  // Format currency value in USD
  formatCurrency(value) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(value);
  },

  // Get human-readable difficulty label
  getDifficultyLabel(rating) {
    const labels = {
      1: "1/5 - Very Easy (No special tools, large pins)",
      2: "2/5 - Easy (Through-hole standard, simple desoldering)",
      3: "3/5 - Moderate (Multi-pin through-hole or standard SMD)",
      4: "4/5 - Hard (Fine pitch SMD or heavy thermal ground planes)",
      5: "5/5 - Expert (BGA packages or heat-sensitive MEMS)"
    };
    return labels[rating] || "Unknown";
  },

  // Get difficulty badge color class
  getDifficultyClass(rating) {
    if (rating <= 2) return 'diff-easy';
    if (rating === 3) return 'diff-medium';
    if (rating === 4) return 'diff-hard';
    return 'diff-expert';
  },

  // Escapes HTML tags to prevent XSS
  escapeHtml(str) {
    const s = typeof str === 'string' ? str : String(str ?? '');
    return s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  },

  // Smooth count-up animation for stats
  animateCount(element, target, duration = 1000, isCurrency = false, suffix = '') {
    if (!element) return;
    const start = 0;
    const startTime = performance.now();

    function update(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing out quad
      const ease = progress * (2 - progress);
      const currentValue = start + (target - start) * ease;

      if (isCurrency) {
        element.textContent = Utils.formatCurrency(currentValue);
      } else {
        element.textContent = Math.floor(currentValue).toLocaleString() + suffix;
      }

      if (progress < 1) {
        requestAnimationFrame(update);
      } else {
        if (isCurrency) {
          element.textContent = Utils.formatCurrency(target);
        } else {
          element.textContent = target.toLocaleString() + suffix;
        }
      }
    }

    requestAnimationFrame(update);
  },

  // Generate printable report layout and open print dialog
  printReport(analyzedList, stats) {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert("Please allow pop-ups to print reports.");
      return;
    }

    const title = "E-Waste Salvage & Reclaim Report";
    const date = new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    // Partition lists
    const salvageable = analyzedList.filter(item => item.component.classification === 'salvageable');
    const recyclable = analyzedList.filter(item => item.component.classification === 'recyclable');
    const hazardous = analyzedList.filter(item => item.component.classification === 'hazardous');

    const generateTableRows = (list) => {
      if (list.length === 0) return `<tr><td colspan="5" class="empty-row">No components in this category</td></tr>`;
      return list.map(item => `
        <tr>
          <td style="font-weight: bold;">${this.escapeHtml(item.quantity)}x</td>
          <td>
            <strong>${this.escapeHtml(item.component.name)}</strong>
            <span class="subtext">${this.escapeHtml(item.component.subcategory)} (${this.escapeHtml(item.component.package)})</span>
          </td>
          <td>${this.getDifficultyLabel(item.component.desolderDifficulty).split(' - ')[0]}</td>
          <td>${item.component.hazards.length > 0 ? `<span class="hazard-badge">${item.component.hazards.join(', ')}</span>` : 'None'}</td>
          <td style="text-align: right; font-family: monospace;">${this.formatCurrency(item.component.estimatedValue * item.quantity)}</td>
        </tr>
      `).join('');
    };

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${title}</title>
        <style>
          body {
            font-family: 'Segoe UI', Helvetica, Arial, sans-serif;
            color: #1e293b;
            line-height: 1.5;
            padding: 40px;
            background-color: #ffffff;
          }
          .header {
            border-bottom: 3px solid #0f172a;
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          .title {
            font-size: 28px;
            font-weight: 800;
            color: #0f172a;
            margin: 0;
          }
          .metadata {
            font-size: 14px;
            color: #64748b;
            margin-top: 5px;
          }
          .stats-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 15px;
            margin-bottom: 40px;
          }
          .stat-card {
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 15px;
            background-color: #f8fafc;
            text-align: center;
          }
          .stat-val {
            font-size: 20px;
            font-weight: bold;
            color: #0f172a;
          }
          .stat-label {
            font-size: 12px;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-top: 5px;
          }
          h2 {
            font-size: 18px;
            border-bottom: 2px solid #e2e8f0;
            padding-bottom: 8px;
            margin-top: 30px;
            margin-bottom: 15px;
            display: flex;
            align-items: center;
          }
          .cat-dot {
            width: 10px;
            height: 10px;
            border-radius: 50%;
            display: inline-block;
            margin-right: 8px;
          }
          .dot-salvage { background-color: #10b981; }
          .dot-recycle { background-color: #3b82f6; }
          .dot-hazard { background-color: #ef4444; }
          
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
          }
          th {
            background-color: #f1f5f9;
            text-align: left;
            padding: 10px 12px;
            font-size: 12px;
            font-weight: 600;
            color: #475569;
            text-transform: uppercase;
            border-bottom: 1px solid #cbd5e1;
          }
          td {
            padding: 10px 12px;
            font-size: 14px;
            border-bottom: 1px solid #e2e8f0;
            vertical-align: top;
          }
          .subtext {
            display: block;
            font-size: 11px;
            color: #64748b;
          }
          .hazard-badge {
            font-size: 11px;
            background-color: #fee2e2;
            color: #991b1b;
            padding: 2px 6px;
            border-radius: 4px;
            font-weight: 500;
          }
          .empty-row {
            color: #94a3b8;
            text-align: center;
            font-style: italic;
            padding: 20px;
          }
          .disclaimer {
            margin-top: 50px;
            border-top: 1px dashed #cbd5e1;
            padding-top: 20px;
            font-size: 11px;
            color: #64748b;
            text-align: center;
          }
          @media print {
            body { padding: 0; }
            button { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">${title}</div>
          <div class="metadata">Generated on ${date} | Salvage Assistant Agent</div>
        </div>

        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-val">${stats.totalItems}</div>
            <div class="stat-label">Total Components</div>
          </div>
          <div class="stat-card">
            <div class="stat-val" style="color: #10b981;">${this.formatCurrency(stats.totalValue)}</div>
            <div class="stat-label">Est. Reclaim Value</div>
          </div>
          <div class="stat-card">
            <div class="stat-val" style="color: #3b82f6;">${stats.weightText}</div>
            <div class="stat-label">E-Waste Diverted</div>
          </div>
          <div class="stat-card">
            <div class="stat-val" style="color: #ef4444;">${stats.hazardousCount}</div>
            <div class="stat-label">Hazardous Items</div>
          </div>
        </div>

        <h2><span class="cat-dot dot-salvage"></span>🟢 Salvageable Components (Worth Saving)</h2>
        <table>
          <thead>
            <tr>
              <th style="width: 8%">Qty</th>
              <th style="width: 35%">Component</th>
              <th style="width: 17%">Desolder Diff.</th>
              <th style="width: 25%">Hazards Identified</th>
              <th style="width: 15%; text-align: right;">Est. Value</th>
            </tr>
          </thead>
          <tbody>
            ${generateTableRows(salvageable)}
          </tbody>
        </table>

        <h2><span class="cat-dot dot-recycle"></span>🔵 Recyclable Components (Standard Recycling)</h2>
        <table>
          <thead>
            <tr>
              <th style="width: 8%">Qty</th>
              <th style="width: 35%">Component</th>
              <th style="width: 17%">Desolder Diff.</th>
              <th style="width: 25%">Hazards Identified</th>
              <th style="width: 15%; text-align: right;">Est. Value</th>
            </tr>
          </thead>
          <tbody>
            ${generateTableRows(recyclable)}
          </tbody>
        </table>

        <h2><span class="cat-dot dot-hazard"></span>🔴 Hazardous Components (Requires Special Disposal)</h2>
        <table>
          <thead>
            <tr>
              <th style="width: 8%">Qty</th>
              <th style="width: 35%">Component</th>
              <th style="width: 17%">Desolder Diff.</th>
              <th style="width: 25%">Hazards Identified</th>
              <th style="width: 15%; text-align: right;">Est. Value</th>
            </tr>
          </thead>
          <tbody>
            ${generateTableRows(hazardous)}
          </tbody>
        </table>

        <div class="disclaimer">
          <strong>Important safety notice:</strong> Desoldering and harvesting circuit boards carries risk of exposure to toxic fumes (lead, flux), burns, and high voltage shocks. Always work in a well-ventilated space, wear eye protection, wash hands after handling, and discharge all high-voltage capacitors before working.
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 500);
          }
        </script>
      </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  }
};

// Export for browser
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Utils;
} else {
  window.Utils = Utils;
}
