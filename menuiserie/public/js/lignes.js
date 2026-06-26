(function () {
  function round2(n) {
    return Math.round((n + Number.EPSILON) * 100) / 100;
  }

  function recalcRow(row) {
    var qte = parseFloat(row.querySelector('.ligne-qte').value) || 0;
    var prix = parseFloat(row.querySelector('.ligne-prix').value) || 0;
    row.querySelector('.ligne-total-cell').textContent = round2(qte * prix).toFixed(2) + ' €';
  }

  function recalcTotaux(table) {
    var tauxTva = parseFloat(document.getElementById('taux_tva').value) || 0;
    var totalHt = 0;
    table.querySelectorAll('.ligne-row').forEach(function (row) {
      var qte = parseFloat(row.querySelector('.ligne-qte').value) || 0;
      var prix = parseFloat(row.querySelector('.ligne-prix').value) || 0;
      totalHt += qte * prix;
    });
    totalHt = round2(totalHt);
    var totalTva = round2(totalHt * (tauxTva / 100));
    var totalTtc = round2(totalHt + totalTva);
    document.getElementById('preview-total-ht').textContent = totalHt.toFixed(2) + ' €';
    document.getElementById('preview-total-tva').textContent = totalTva.toFixed(2) + ' €';
    document.getElementById('preview-total-ttc').textContent = totalTtc.toFixed(2) + ' €';
  }

  document.addEventListener('DOMContentLoaded', function () {
    var table = document.getElementById('lignes-table');
    if (!table) return;
    var tbody = table.querySelector('tbody');
    var template = document.getElementById('ligne-template');
    var addButton = document.getElementById('add-ligne');

    function update() {
      table.querySelectorAll('.ligne-row').forEach(recalcRow);
      recalcTotaux(table);
    }

    addButton.addEventListener('click', function () {
      var clone = template.content.cloneNode(true);
      tbody.appendChild(clone);
      update();
    });

    table.addEventListener('input', function (e) {
      if (e.target.matches('.ligne-qte, .ligne-prix')) {
        update();
      }
    });

    document.getElementById('taux_tva').addEventListener('input', function () {
      recalcTotaux(table);
    });

    table.addEventListener('click', function (e) {
      if (e.target.matches('.remove-ligne')) {
        var rows = table.querySelectorAll('.ligne-row');
        if (rows.length > 1) {
          e.target.closest('tr').remove();
          update();
        }
      }
    });

    update();
  });
})();
