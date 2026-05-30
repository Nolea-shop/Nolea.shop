// Nolea Loading Screen
window.addEventListener('load', function() {
  setTimeout(function() {
    var loader = document.getElementById('nolea-loader');
    if (loader) {
      loader.classList.add('hidden');
      setTimeout(function() { loader.remove(); }, 500);
    }
  }, 800);
});
