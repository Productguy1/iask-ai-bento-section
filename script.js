document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.section-title, .section-subtitle, .bento-card').forEach(el => {
    el.classList.add('animate-in');
  });
});
