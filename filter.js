/* Stage filter — Teacher Tools and Student Practice pages.
   Chips carry data-stage ("all", "4", "5"). Real resource cards carry
   data-stage too. Empty "coming soon" placeholder cards have no
   data-stage and are always shown, since they're not stage-specific. */
(function () {
  var chips = document.querySelectorAll('.chip[data-stage]');
  var cards = document.querySelectorAll('.resource-card[data-stage]');

  chips.forEach(function (chip) {
    chip.addEventListener('click', function () {
      var stage = chip.getAttribute('data-stage');

      chips.forEach(function (c) { c.classList.remove('active'); });
      chip.classList.add('active');

      cards.forEach(function (card) {
        var show = stage === 'all' || card.getAttribute('data-stage') === stage;
        card.style.display = show ? '' : 'none';
      });
    });
  });
})();
